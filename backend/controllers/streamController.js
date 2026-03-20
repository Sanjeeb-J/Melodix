const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");
const ytdl = require("@distube/ytdl-core");

// Use system ffmpeg on Railway/Docker, else fallback to ffmpeg-static for local
const FFMPEG_BIN = process.env.FFMPEG_PATH || (process.env.RAILWAY_STATIC_URL ? "ffmpeg" : ffmpegStatic);

// ─── Controller ───────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[Stream] Starting ytdl-core + ffmpeg pipe for ${videoId}`);

  try {
    // 1. Create ytdl stream
    const ytdlStream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25, // 32MB buffer
    });

    // 2. Setup ffmpeg to encode to MP3
    const ffmpegArgs = [
      "-hide_banner", "-loglevel", "info",
      "-i", "pipe:0",           // read from stdin
      "-vn",                    // no video
      "-acodec", "libmp3lame",
      "-ab", "128k",
      "-f", "mp3",
      "pipe:1",                 // write to stdout
    ];
    
    const ff = spawn(FFMPEG_BIN, ffmpegArgs);

    // 3. Pipe ytdl -> ffmpeg -> res
    ytdlStream.pipe(ff.stdin);
    ff.stdout.pipe(res);

    // 4. Send headers
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    });

    // ─── Error and Close Logic ────────────────────────────────────────────────
    ff.stderr.on("data", (d) => {
      const msg = d.toString().trim();
      if (msg && (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed"))) {
        console.error(`[ffmpeg] ${msg}`);
      }
    });

    ff.on("error", (err) => {
      console.error(`[Stream] ffmpeg failed to start: ${err.message}`);
    });

    ff.on("close", (code) => {
      console.log(`[Stream] ffmpeg process closed with code ${code} for ${videoId}`);
      if (!res.writableEnded) res.end();
    });
    
    ytdlStream.on("error", (err) => {
        console.error(`[Stream] ytdl-core error: ${err.message}`);
        ff.stdin.end();
    });

    // Cleanup on client disconnect
    req.on("close", () => {
      console.log(`[Stream] Client closed connection for ${videoId}. Cleaning up.`);
      try {
        ytdlStream.destroy();
        ff.kill("SIGKILL");
      } catch (e) {
        // Ignore
      }
    });

  } catch (err) {
    console.error(`[Stream] Fatal error: ${err.message}`);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to fetch audio stream", error: err.message });
    } else {
        res.end();
    }
  }
};

module.exports = { streamAudio };
