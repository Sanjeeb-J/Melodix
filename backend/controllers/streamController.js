const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");

// Use system ffmpeg on Railway/Docker, else fallback to ffmpeg-static for local
const FFMPEG_BIN = process.env.FFMPEG_PATH || (process.env.RAILWAY_STATIC_URL ? "ffmpeg" : ffmpegStatic);
// Use system yt-dlp
const YTDLP_BIN = "yt-dlp";


// ─── Controller ───────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  console.log(`[Stream] Starting yt-dlp + ffmpeg pipe for ${videoId}`);

  try {
    // Send headers as we're now ready to stream
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    });

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Step 1 - get stream via yt-dlp directly
    const ytdlArgs = [
      url,
      "-o", "-",           // write to stdout
      "-q",                // quiet
      "-f", "bestaudio[ext=m4a]/bestaudio",   // preferred formats
      "--no-playlist",
      "--no-warnings"
    ];

    const ytdlProcess = spawn(YTDLP_BIN, ytdlArgs);


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

    // Pipe yt-dlp stream → ffmpeg
    ytdlProcess.stdout.pipe(ff.stdin);

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
    
    ytdlProcess.on("error", (err) => {
        console.error(`[Stream] yt-dlp process closed with error: ${err.message}`);
        ff.stdin.end();
    });

    // Cleanup on client disconnect
    req.on("close", () => {
      console.log(`[Stream] Client closed connection for ${videoId}. Cleaning up processes.`);
      try {
        if(ytdlProcess) ytdlProcess.kill("SIGKILL");
        ff.kill("SIGKILL");
      } catch (e) {
        // Ignore errors during kill
      }
    });

  } catch (err) {
    console.error(`[Stream] Error setting up stream with yt-dlp: ${err.message}`);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to fetch audio stream", error: err.message });
    } else {
        res.end();
    }
  }
};

module.exports = { streamAudio };
