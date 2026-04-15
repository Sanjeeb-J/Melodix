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
  console.log(`[Stream] Request received for videoId: ${videoId}`);
  
  // Try to get the pre-initialized Innertube instance from the app context
  const yt = req.app.get('yt');
  let cookieFilePath = null;

  try {
    // ─── Engine 1: youtubei.js (Innertube) - Primary & Most Stable ─────────────
    if (yt) {
      try {
        console.log(`[Stream] Starting Innertube + ffmpeg pipe for ${videoId}`);
        const info = await yt.getInfo(videoId);
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        const youtubeStream = await info.download(format);
        
        const ffmpegArgs = [
          "-hide_banner", "-loglevel", "error",
          "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1",
        ];
        
        const ff = spawn(FFMPEG_BIN, ffmpegArgs);
        res.writeHead(200, { 
          "Content-Type": "audio/mpeg", 
          "Cache-Control": "no-cache", 
          "Transfer-Encoding": "chunked",
          "Connection": "keep-alive"
        });

        youtubeStream.pipe(ff.stdin);
        ff.stdout.pipe(res);

        ff.on("close", () => { if (!res.writableEnded) res.end(); });
        youtubeStream.on("error", (err) => { 
          console.error(`[Stream] Innertube stream error: ${err.message}`); 
          ff.stdin.end(); 
        });

        req.on("close", () => {
          try {
            console.log(`[Stream] Client disconnected, killing Innertube pipe for ${videoId}`);
            youtubeStream.destroy();
            ff.kill("SIGKILL");
          } catch (e) {}
        });

        return; // Success!
      } catch (innertubeErr) {
        console.error(`[Stream] Innertube failed, falling back: ${innertubeErr.message}`);
      }
    }

    // ─── Engine 2: yt-dlp - Powerful Backup ───────────────────────────────────
    if (isYtdlpAvailable) {
      console.log(`[Stream] Starting fallback: yt-dlp for ${videoId}`);
      const ytdlArgs = [url, "-o", "-", "-q", "-f", "bestaudio[ext=m4a]/bestaudio", "--no-playlist"];
      if (process.env.YOUTUBE_COOKIE) {
        cookieFilePath = path.join(os.tmpdir(), `cookie_${Date.now()}.txt`);
        fs.writeFileSync(cookieFilePath, process.env.YOUTUBE_COOKIE);
        ytdlArgs.push("--cookies", cookieFilePath);
      }

      const ytdlProcess = spawn(YTDLP_BIN, ytdlArgs);
      const ff = spawn(FFMPEG_BIN, ["-i", "pipe:0", "-vn", "-f", "mp3", "pipe:1"]);
      
      res.writeHead(200, { "Content-Type": "audio/mpeg" });
      ytdlProcess.stdout.pipe(ff.stdin);
      ff.stdout.pipe(res);

      ff.on("close", () => {
        if (cookieFilePath && fs.existsSync(cookieFilePath)) fs.unlinkSync(cookieFilePath);
        if (!res.writableEnded) res.end();
      });

      req.on("close", () => {
        try { ytdlProcess.kill("SIGKILL"); ff.kill("SIGKILL"); } catch (e) {}
      });
      return;
    }

    // ─── Engine 3: ytdl-core - Final Resort ──────────────────────────────────
    console.log(`[Stream] Starting last resort: ytdl-core for ${videoId}`);
    const options = { filter: "audioonly", quality: "highestaudio" };
    if (process.env.YOUTUBE_COOKIE) {
      const cookies = parseCookiesToObjects(process.env.YOUTUBE_COOKIE);
      if (cookies.length > 0) options.agent = ytdl.createAgent(cookies);
    }

    const ytdlStream = ytdl(url, options);
    const ff = spawn(FFMPEG_BIN, ["-i", "pipe:0", "-vn", "-f", "mp3", "pipe:1"]);
    res.writeHead(200, { "Content-Type": "audio/mpeg" });
    ytdlStream.pipe(ff.stdin);
    ff.stdout.pipe(res);

    ff.on("close", () => { if (!res.writableEnded) res.end(); });
    req.on("close", () => { try { ytdlStream.destroy(); ff.kill("SIGKILL"); } catch (e) {} });

  } catch (err) {
    console.error(`[Stream] Fatal controller error: ${err.message}`);
    if (cookieFilePath && fs.existsSync(cookieFilePath)) fs.unlinkSync(cookieFilePath);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to stream audio after all attempts", error: err.message });
    } else {
      res.end();
    }
  }
};

const debugStream = async (req, res) => {
  const { videoId } = req.params;
  const yt = req.app.get('yt');
  const results = {
    videoId,
    innertubeAvailable: !!yt,
    isYtdlpAvailable,
    log: []
  };

  try {
    results.log.push("Checking Innertube...");
    if (yt) {
      const info = await yt.getInfo(videoId);
      results.innertubeTitle = info.basic_info.title;
      results.log.push("Innertube test successful");
    } else {
      results.log.push("Innertube NOT initialized in app context");
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message, log: results.log });
  }
};

module.exports = { streamAudio, debugStream };
