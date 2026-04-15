const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const ffmpegStatic = require("ffmpeg-static");
const ytdl = require("@distube/ytdl-core");

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const ffmpegStatic = require("ffmpeg-static");
const ytdl = require("@distube/ytdl-core");
const ytdlpExec = require("yt-dlp-exec");

// Environment-aware binary paths (Docker-first)
const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegStatic;
const YTDLP_BIN = process.env.YTDLP_PATH || "yt-dlp";

// Log detected environment
console.log(`[Stream] Environment: ${process.env.NODE_ENV}, FFMPEG: ${FFMPEG_BIN}, YT-DLP: ${YTDLP_BIN}`);

let isYtdlpAvailable = false;
try {
  execSync(`${YTDLP_BIN} --version`);
  isYtdlpAvailable = true;
  console.log(`[Stream] yt-dlp verified via ${YTDLP_BIN}`);
} catch (e) {
  try {
    execSync("yt-dlp --version");
    isYtdlpAvailable = true;
    console.log("[Stream] yt-dlp verified in system PATH");
  } catch (err) {
    console.log("[Stream] Native yt-dlp missing, will use yt-dlp-exec for failovers.");
  }
}

// Helper to parse Netscape HTTP Cookie File into an array of cookie objects for ytdl-core agent
const parseCookiesToObjects = (cookieText) => {
    if (!cookieText) return [];
    const normalizedText = cookieText.replace(/\\n/g, "\n");
    if (normalizedText.trim().startsWith("[")) {
        try { return JSON.parse(normalizedText); } catch (e) { console.error("[Stream] JSON cookie error:", e.message); }
    }
    const cookies = [];
    const lines = normalizedText.split("\n");
    for (const line of lines) {
        if (!line.trim() || line.startsWith("#")) continue;
        const parts = line.split("\t");
        if (parts.length >= 7) {
            cookies.push({
                domain: parts[0], path: parts[2],
                secure: parts[3].toUpperCase() === "TRUE",
                expirationDate: parseInt(parts[4]),
                name: parts[5], value: parts[6].trim()
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
  const yt = req.app.get('yt');
  let cookieFilePath = null;

  try {
    // ─── Engine 1: youtubei.js (Innertube) ─────────────
    if (yt) {
      try {
        console.log(`[Stream] Target: ${videoId} (Engine: Innertube)`);
        const info = await yt.getInfo(videoId);
        
        // Target highest quality audio only mp4/m4a
        const format = info.chooseFormat({ 
          type: 'audio', 
          quality: 'best',
          format: 'mp4' 
        });

        if (!format) throw new Error("No suitable audio format found via Innertube");

        console.log(`[Stream] Selected format: ${format.mime_type} (${format.audio_sample_rate}Hz)`);
        const youtubeStream = await info.download(format);
        
        const ff = spawn(FFMPEG_BIN, [
          "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1"
        ]);
        
        res.writeHead(200, { "Content-Type": "audio/mpeg", "Transfer-Encoding": "chunked" });
        youtubeStream.pipe(ff.stdin);
        ff.stdout.pipe(res);

        ff.on("close", () => { if (!res.writableEnded) res.end(); });
        youtubeStream.on("error", (e) => { console.error("[Stream] Innertube pipe err:", e.message); ff.stdin.end(); });
        req.on("close", () => { try { youtubeStream.destroy(); ff.kill("SIGKILL"); } catch (e) {} });
        return;
      } catch (innertubeErr) {
        console.error(`[Stream] Innertube failed: ${innertubeErr.message}`);
      }
    }

    // ─── Engine 2: yt-dlp-exec (The heavy lifter) ───────────────────────────────────
    try {
      console.log(`[Stream] Target: ${videoId} (Engine: yt-dlp)`);
      
      const ytdlpOptions = {
        output: '-',
        format: 'bestaudio',
        noCheckCertificates: true,
        noWarnings: true,
        addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
      };

      if (process.env.YOUTUBE_COOKIE) {
        cookieFilePath = path.join(os.tmpdir(), `c_${Date.now()}.txt`);
        fs.writeFileSync(cookieFilePath, process.env.YOUTUBE_COOKIE.replace(/\\n/g, "\n"));
        ytdlpOptions.cookie = cookieFilePath;
      }

      const stream = ytdlpExec.execStream(url, ytdlpOptions);
      const ff = spawn(FFMPEG_BIN, ["-i", "pipe:0", "-vn", "-f", "mp3", "pipe:1"]);
      
      res.writeHead(200, { "Content-Type": "audio/mpeg" });
      stream.pipe(ff.stdin);
      ff.stdout.pipe(res);

      ff.on("close", () => {
        if (cookieFilePath && fs.existsSync(cookieFilePath)) fs.unlinkSync(cookieFilePath);
        if (!res.writableEnded) res.end();
      });

      req.on("close", () => { try { stream.kill(); ff.kill("SIGKILL"); } catch (e) {} });
      return;
    } catch (ytdlpErr) {
      console.error(`[Stream] yt-dlp failed: ${ytdlpErr.message}`);
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
