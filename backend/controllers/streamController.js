const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");
const play = require("play-dl");

// Use system ffmpeg on Docker (has libmp3lame), else ffmpeg-static
const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegStatic;

// ─── Controller ───────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  console.log(`[Stream] Starting play-dl + ffmpeg pipe for ${videoId}`);

  try {
    // Obtain stream using play-dl (handles bypassing 403 / anti-bot naturally)
    const streamInfo = await play.stream(videoId, { discordPlayerCompatibility : false });
    console.log(`[Stream] Successfully retrieved audio stream for ${videoId} using play-dl.`);

    // Send headers as we're now ready to stream
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    });

    // Step 2 – ffmpeg reads from stdin, encodes to MP3, writes to stdout
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

    // Pipe play-dl stream → ffmpeg
    streamInfo.stream.pipe(ff.stdin);

    // Pipe ffmpeg output → HTTP response
    ff.stdout.pipe(res);

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
    
    streamInfo.stream.on("error", (err) => {
        console.error(`[Stream] play-dl stream closed with error: ${err.message}`);
        ff.stdin.end();
    });

    // Cleanup on client disconnect
    req.on("close", () => {
      console.log(`[Stream] Client closed connection for ${videoId}. Cleaning up processes.`);
      try {
        if(streamInfo.stream) streamInfo.stream.destroy();
        ff.kill("SIGKILL");
      } catch (e) {
        // Ignore errors during kill
      }
    });

  } catch (err) {
    console.error(`[Stream] Error getting video stream with play-dl: ${err.message}`);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to fetch audio stream", error: err.message });
    } else {
        res.end();
    }
  }
};

module.exports = { streamAudio };
