const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");
const ytdl = require("@distube/ytdl-core");

// Use system ffmpeg on Railway/Docker, else fallback to ffmpeg-static for local
const FFMPEG_BIN = process.env.FFMPEG_PATH || (process.env.RAILWAY_STATIC_URL ? "ffmpeg" : ffmpegStatic);

// Helper to parse Netscape HTTP Cookie File into an array of cookie objects for ytdl-core agent
const parseCookiesToObjects = (cookieText) => {
    if (!cookieText) return [];
    
    // If it looks like a JSON array already, try parsing it
    if (cookieText.trim().startsWith("[")) {
        try {
            return JSON.parse(cookieText);
        } catch (e) {
            console.error("[Stream] Error parsing YOUTUBE_COOKIE as JSON:", e.message);
        }
    }

    const cookies = [];
    const lines = cookieText.split("\n");
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
  console.log(`[Stream] Starting ytdl-core + ffmpeg pipe for ${videoId}`);

  try {
    let agent;
    if (process.env.YOUTUBE_COOKIE) {
        try {
            const cookies = parseCookiesToObjects(process.env.YOUTUBE_COOKIE);
            if (cookies.length > 0) {
                agent = ytdl.createAgent(cookies);
                console.log(`[Stream] ytdl-core agent created with ${cookies.length} cookies`);
            }
        } catch (e) {
            console.error("[Stream] Failed to create ytdl agent:", e.message);
        }
    }

    const options = {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25, // 32MB buffer
    };

    if (agent) {
        options.agent = agent;
    }

    // 1. Create ytdl stream
    const ytdlStream = ytdl(url, options);

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
