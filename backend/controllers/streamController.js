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
  const hasCookies = !!process.env.YOUTUBE_COOKIE;

  // Set response headers early to prevent 504/502 from Render load balancer
  res.writeHead(200, { "Content-Type": "audio/mpeg", "Transfer-Encoding": "chunked" });

  try {
    // ─── Engine 1: yt-dlp (Primary for Guests) ───────────────────
    // yt-dlp is currently most resilient to guest blocks
    if (!hasCookies) {
      try {
        console.log(`[Stream] Guest mode detected. Trying yt-dlp first for ${videoId}`);
        const stream = ytdlpExec.execStream(url, {
          output: '-',
          format: 'bestaudio',
          noCheckCertificates: true,
          noWarnings: true,
          addHeader: [
            'referer:https://www.youtube.com/',
            'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ],
        });

        const ff = spawn(FFMPEG_BIN, [
          "-hide_banner", "-loglevel", "error",
          "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1"
        ]);

        stream.pipe(ff.stdin);
        ff.stdout.pipe(res);

        ff.on("close", () => { if (!res.writableEnded) res.end(); });
        req.on("close", () => { try { stream.kill(); ff.kill("SIGKILL"); } catch (e) {} });
        console.log(`[Stream] yt-dlp pipe initialized for ${videoId}`);
        return;
      } catch (ytdlpErr) {
        console.warn(`[Stream] yt-dlp failed: ${ytdlpErr.message}`);
      }
    }

    // ─── Engine 2: youtubei.js (Primary for Auth / Fallback for Guest) ─────────────
    if (yt) {
      try {
        console.log(`[Stream] Trying youtubei.js for ${videoId}`);
        const info = await yt.getInfo(videoId);
        const format = info.chooseFormat({ type: 'audio', quality: 'best', format: 'any' });

        if (!format) throw new Error("No suitable audio format found by Innertube");

        const youtubeStream = await info.download(format);
        const ff = spawn(FFMPEG_BIN, [
          "-hide_banner", "-loglevel", "error",
          "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1"
        ]);

        youtubeStream.pipe(ff.stdin);
        ff.stdout.pipe(res);

        ff.on("close", () => { if (!res.writableEnded) res.end(); });
        youtubeStream.on("error", (e) => { 
          console.error("[Stream] Innertube error:", e.message); 
          ff.stdin.end(); 
        });
        req.on("close", () => { try { youtubeStream.destroy(); ff.kill("SIGKILL"); } catch (e) {} });
        console.log(`[Stream] youtubei.js pipe initialized for ${videoId}`);
        return;
      } catch (innertubeErr) {
        console.warn(`[Stream] youtubei.js failed: ${innertubeErr.message}`);
      }
    }

    // ─── Engine 3: ytdl-core (Final Resort) ──────────────────────────────────
    try {
      console.log(`[Stream] Trying ytdl-core as last resort for ${videoId}`);
      const options = { filter: "audioonly", quality: "highestaudio" };
      if (hasCookies) {
        const cookies = parseCookiesToObjects(process.env.YOUTUBE_COOKIE);
        if (cookies.length > 0) options.agent = ytdl.createAgent(cookies);
      }

      const ytdlStream = ytdl(url, options);
      const ff = spawn(FFMPEG_BIN, [
        "-hide_banner", "-loglevel", "error",
        "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1"
      ]);

      ytdlStream.pipe(ff.stdin);
      ff.stdout.pipe(res);

      ff.on("close", () => { if (!res.writableEnded) res.end(); });
      ytdlStream.on("error", (e) => { console.error("[Stream] ytdl-core error:", e.message); ff.stdin.end(); });
      req.on("close", () => { try { ytdlStream.destroy(); ff.kill("SIGKILL"); } catch (e) {} });
      console.log(`[Stream] ytdl-core pipe initialized for ${videoId}`);
      return;
    } catch (ytdlErr) {
       console.error(`[Stream] All engines failed for ${videoId}`);
       throw new Error("Failed to stream after all engine attempts");
    }

  } catch (err) {
    console.error(`[Stream] Fatal: ${err.message}`);
    if (!res.writableEnded) {
       // Since we set res.writeHead(200) early, we can't change the status code now.
       // We just end the stream to let the client handle the error.
       res.end();
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
