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

  let headersSent = false;
  const sendHeaders = () => {
    if (!headersSent && !res.writableEnded) {
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Transfer-Encoding": "chunked" });
      headersSent = true;
      console.log(`[Stream] Headers sent to client for ${videoId}`);
    }
  };

  // --- ENGINE ATTEMPT HELPER ---
  const tryEngine = (engineName, startFn) => {
    return new Promise((resolve) => {
      console.log(`[Stream] Attempting engine: ${engineName} for ${videoId}`);
      let engineResolved = false;

      const onData = () => {
        if (!engineResolved) {
          engineResolved = true;
          sendHeaders();
          resolve(true); // Success
        }
      };

      const onFail = (err) => {
        if (!engineResolved) {
          engineResolved = true;
          console.warn(`[Stream] Engine ${engineName} failed: ${err}`);
          resolve(false); // Try next engine
        }
      };

      // Set a safety timeout for engine startup (10s)
      const timeout = setTimeout(() => onFail("Startup timeout"), 10000);

      try {
        startFn(onData, onFail, () => {
          clearTimeout(timeout);
        });
      } catch (e) {
        clearTimeout(timeout);
        onFail(e.message);
      }
    });
  };

  // ─── Engine 1: yt-dlp ───────────────────
  if (!hasCookies) {
    const success = await tryEngine("yt-dlp", (onData, onFail, cleanup) => {
      const subprocess = ytdlpExec.exec(url, {
        output: '-',
        format: 'ba[ext=m4a]/ba',
        noCheckCertificates: true,
        noWarnings: true,
        noPlaylist: true,
        quiet: true,
        extractorArgs: 'youtube:player-client=android,tv',
        addHeader: ['referer:https://www.youtube.com/', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
      }, { stdio: ['ignore', 'pipe', 'pipe'] });

      const ff = spawn(FFMPEG_BIN, [
        "-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1"
      ]);

      subprocess.stdout.once("data", onData);
      subprocess.stderr.on("data", (d) => {
        const msg = d.toString().trim();
        if (msg.includes("ERROR")) console.warn(`[Stream] yt-dlp error: ${msg}`);
      });
      subprocess.on("close", (code) => { if (code !== 0) onFail(`Process exited ${code}`); });
      subprocess.on("error", (e) => onFail(e.message));

      subprocess.stdout.pipe(ff.stdin);
      ff.stdout.pipe(res);

      req.on("close", () => { 
        cleanup();
        try { subprocess.kill(); ff.kill("SIGKILL"); } catch (e) {} 
      });
      ff.on("close", () => { if (!res.writableEnded) res.end(); });
    });
    if (success) return;
  }

  // ─── Engine 2: youtubei.js ─────────────
  if (yt) {
    const success = await tryEngine("youtubei.js", async (onData, onFail, cleanup) => {
      try {
        const info = await yt.getInfo(videoId);
        const format = info.chooseFormat({ type: 'audio', quality: 'best', format: 'any' });
        if (!format) return onFail("No format");

        const youtubeStream = await info.download(format);
        const ff = spawn(FFMPEG_BIN, [
          "-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1"
        ]);

        youtubeStream.once("data", onData);
        youtubeStream.pipe(ff.stdin);
        ff.stdout.pipe(res);

        youtubeStream.on("error", (e) => onFail(e.message));
        ff.on("close", () => { if (!res.writableEnded) res.end(); });
        req.on("close", () => { cleanup(); try { youtubeStream.destroy(); ff.kill("SIGKILL"); } catch (e) {} });
      } catch (e) { onFail(e.message); }
    });
    if (success) return;
  }

  // ─── Engine 3: ytdl-core ──────────────────────────────────
  await tryEngine("ytdl-core", (onData, onFail, cleanup) => {
    try {
      const options = { filter: "audioonly", quality: "highestaudio" };
      if (hasCookies) {
        const cookies = parseCookiesToObjects(process.env.YOUTUBE_COOKIE);
        if (cookies.length > 0) options.agent = ytdl.createAgent(cookies);
      }

      const ytdlStream = ytdl(url, options);
      const ff = spawn(FFMPEG_BIN, [
        "-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "128k", "-f", "mp3", "pipe:1"
      ]);

      ytdlStream.once("data", onData);
      ytdlStream.pipe(ff.stdin);
      ff.stdout.pipe(res);

      ytdlStream.on("error", (e) => onFail(e.message));
      ff.on("close", () => { if (!res.writableEnded) res.end(); });
      req.on("close", () => { cleanup(); try { ytdlStream.destroy(); ff.kill("SIGKILL"); } catch (e) {} });
    } catch (e) { onFail(e.message); }
  });

  if (!headersSent && !res.writableEnded) {
    res.status(502).json({ message: "All streaming engines failed. YouTube may be blocking the server IP." });
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
