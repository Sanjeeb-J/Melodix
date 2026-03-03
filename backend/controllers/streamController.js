const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");

// ─── Config ───────────────────────────────────────────────────────────────────
// Docker/Linux: set YTDLP_PATH=/usr/local/bin/yt-dlp in the environment
// Windows dev:  falls back to `python -m yt_dlp`
const YTDLP_PATH = process.env.YTDLP_PATH || null;

// Use system ffmpeg on Docker (has libmp3lame), else ffmpeg-static
const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegStatic;

// ─── Spawn yt-dlp ─────────────────────────────────────────────────────────────
function spawnYtDlp(args) {
  if (YTDLP_PATH) {
    return spawn(YTDLP_PATH, args);
  }
  // Windows: python -m yt_dlp
  return spawn("python", ["-m", "yt_dlp", ...args]);
}

// ─── Controller ───────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  console.log(`[Stream] Starting yt-dlp + ffmpeg pipe for ${videoId}`);

  // Step 1 – yt-dlp downloads audio to stdout, no temp file
  const ytdlpArgs = [
    "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
    "--no-playlist",
    "--no-warnings",
    "-o", "-",    // output to stdout
    `https://www.youtube.com/watch?v=${videoId}`,
  ];
  const ytdlp = spawnYtDlp(ytdlpArgs);

  // Step 2 – ffmpeg reads from stdin, encodes to MP3, writes to stdout
  const ffmpegArgs = [
    "-hide_banner", "-loglevel", "info", // Changed to info for better debugging
    "-i", "pipe:0",           // read from stdin (yt-dlp output)
    "-vn",                    // no video
    "-acodec", "libmp3lame",
    "-ab", "128k",
    "-f", "mp3",
    "pipe:1",                 // write to stdout
  ];
  const ff = spawn(FFMPEG_BIN, ffmpegArgs);

  // Pipe yt-dlp → ffmpeg
  ytdlp.stdout.pipe(ff.stdin);

  // Send headers — but only once we've successfully spawned the processes
  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-cache",
    "Transfer-Encoding": "chunked",
  });

  // Pipe ffmpeg output → HTTP response
  ff.stdout.pipe(res);

  // ─── Error and Close Logic ────────────────────────────────────────────────
  ytdlp.stderr.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg && !msg.includes("Downloading") && !msg.includes("Extracting")) {
      console.error(`[yt-dlp] ${msg}`);
    }
  });

  ff.stderr.on("data", (d) => {
    const msg = d.toString().trim();
     // Only log actual errors, not progress
    if (msg && (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed"))) {
      console.error(`[ffmpeg] ${msg}`);
    }
  });

  ytdlp.on("error", (err) => {
    console.error(`[Stream] yt-dlp failed to start: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ message: "yt-dlp start failed" });
  });

  ff.on("error", (err) => {
    console.error(`[Stream] ffmpeg failed to start: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ message: "ffmpeg start failed" });
  });

  ytdlp.on("close", (code) => {
    console.log(`[Stream] yt-dlp process closed with code ${code}`);
    ff.stdin.end(); // Inform ffmpeg that input is finished
  });

  ff.on("close", (code) => {
    console.log(`[Stream] ffmpeg process closed with code ${code}`);
    if (!res.writableEnded) res.end();
  });

  // Cleanup on client disconnect
  req.on("close", () => {
    console.log(`[Stream] Client closed connection for ${videoId}. Cleaning up processes.`);
    try {
      ytdlp.kill("SIGKILL");
      ff.kill("SIGKILL");
    } catch (e) {
      // Ignore errors during kill
    }
  });
};

module.exports = { streamAudio };
