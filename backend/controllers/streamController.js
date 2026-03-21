const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const ffmpegStatic = require("ffmpeg-static");
const ytdl = require("@distube/ytdl-core");

// Use system ffmpeg on Railway/Docker, else fallback to ffmpeg-static for local
const FFMPEG_BIN = process.env.FFMPEG_PATH || (process.env.RAILWAY_STATIC_URL ? "ffmpeg" : ffmpegStatic);
// Use system yt-dlp
const YTDLP_BIN = "yt-dlp";

// Check if yt-dlp is available in the system path
let isYtdlpAvailable = false;
try {
  const version = execSync(`${YTDLP_BIN} --version`).toString().trim();
  isYtdlpAvailable = true;
  console.log(`[Stream] yt-dlp detected! Version: ${version}`);
} catch (e) {
  console.log("[Stream] yt-dlp NOT found in system path. Fallback to ytdl-core.");
  console.log(`[Stream] Debug: ${e.message}`);
}

// Helper to parse Netscape HTTP Cookie File into an array of cookie objects for ytdl-core agent
const parseCookiesToObjects = (cookieText) => {
    if (!cookieText) return [];
    
    // Replace literal '\n' strings with real newlines just in case
    const normalizedText = cookieText.replace(/\\n/g, "\n");

    // If it looks like a JSON array already, try parsing it
    if (normalizedText.trim().startsWith("[")) {
        try {
            return JSON.parse(normalizedText);
        } catch (e) {
            console.error("[Stream] Error parsing YOUTUBE_COOKIE as JSON:", e.message);
        }
    }

    const cookies = [];
    const lines = normalizedText.split("\n");
    for (const line of lines) {
        if (!line.trim() || line.startsWith("#")) continue;
        const parts = line.split("\t");
        if (parts.length >= 7) {
            cookies.push({
                domain: parts[0],
                path: parts[2],
                secure: parts[3].toUpperCase() === "TRUE",
                expirationDate: parseInt(parts[4]),
                name: parts[5],
                value: parts[6].trim()
            });
        }
    }
    return cookies;
};

// ─── Controller ───────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  let cookieFilePath = null;

  try {
    // Determine which engine to use
    if (isYtdlpAvailable) {
      console.log(`[Stream] Starting yt-dlp + ffmpeg pipe for ${videoId}`);
      
      const ytdlArgs = [
        url,
        "-o", "-",
        "-q",
        "-f", "bestaudio[ext=m4a]/bestaudio",
        "--no-playlist",
      ];

      // Add cookies if available
      if (process.env.YOUTUBE_COOKIE) {
        cookieFilePath = path.join(os.tmpdir(), `cookie_${Date.now()}.txt`);
        fs.writeFileSync(cookieFilePath, process.env.YOUTUBE_COOKIE);
        ytdlArgs.push("--cookies", cookieFilePath);
      }

      const ytdlProcess = spawn(YTDLP_BIN, ytdlArgs);
      
      const ffmpegArgs = [
        "-hide_banner", "-loglevel", "error",
        "-i", "pipe:0",
        "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1",
      ];
      
      const ff = spawn(FFMPEG_BIN, ffmpegArgs);
      ytdlProcess.stdout.pipe(ff.stdin);
      ff.stdout.pipe(res);

      res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache", "Transfer-Encoding": "chunked" });

      ff.on("close", (code) => {
        if (cookieFilePath && fs.existsSync(cookieFilePath)) fs.unlinkSync(cookieFilePath);
        if (!res.writableEnded) res.end();
      });

      ytdlProcess.on("error", (err) => {
          console.error(`[Stream] yt-dlp error: ${err.message}`);
          ff.stdin.end();
      });

      req.on("close", () => {
        try {
          ytdlProcess.kill("SIGKILL");
          ff.kill("SIGKILL");
        } catch (e) {}
      });

    } else {
      // Fallback to ytdl-core
      console.log(`[Stream] Starting ytdl-core + ffmpeg pipe for ${videoId}`);
      let agent;
      if (process.env.YOUTUBE_COOKIE) {
          try {
              const cookies = parseCookiesToObjects(process.env.YOUTUBE_COOKIE);
              if (cookies.length > 0) {
                  agent = ytdl.createAgent(cookies);
              }
          } catch (e) {
              console.error("[Stream] Failed to create ytdl agent:", e.message);
          }
      }

      const options = { filter: "audioonly", quality: "highestaudio", highWaterMark: 1 << 25 };
      if (agent) options.agent = agent;

      const ytdlStream = ytdl(url, options);

      const ffmpegArgs = [
        "-hide_banner", "-loglevel", "error",
        "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1",
      ];
      
      const ff = spawn(FFMPEG_BIN, ffmpegArgs);
      ytdlStream.pipe(ff.stdin);
      ff.stdout.pipe(res);

      res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache", "Transfer-Encoding": "chunked" });

      ff.on("close", () => { if (!res.writableEnded) res.end(); });
      ytdlStream.on("error", (err) => { console.error(`[Stream] ytdl-core error: ${err.message}`); ff.stdin.end(); });

      req.on("close", () => {
        try {
            ytdlStream.destroy();
            ff.kill("SIGKILL");
        } catch (e) {}
      });
    }

  } catch (err) {
    console.error(`[Stream] Fatal error: ${err.message}`);
    if (cookieFilePath && fs.existsSync(cookieFilePath)) fs.unlinkSync(cookieFilePath);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to fetch audio stream", error: err.message });
    } else {
      res.end();
    }
  }
};

module.exports = { streamAudio };
