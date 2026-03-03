const youtubedl = require("youtube-dl-exec");
const fs = require("fs");
const https = require("https");
const http = require("http");

// Use system yt-dlp if it exists (for Docker), otherwise let the package handle it
const binaryPath = fs.existsSync("/usr/local/bin/yt-dlp") ? "/usr/local/bin/yt-dlp" : undefined;
const ydl = binaryPath ? youtubedl.create(binaryPath) : youtubedl;

// ─── 10-song LRU Cache ──────────────────────────────────────────────────────
const MAX_CACHE_SIZE = 10;
const audioCache = new Map(); // key: videoId, value: { buffer, contentType }

function cacheGet(videoId) {
  if (!audioCache.has(videoId)) return null;
  const entry = audioCache.get(videoId);
  audioCache.delete(videoId);
  audioCache.set(videoId, entry); // refresh recency
  return entry;
}

function cacheSet(videoId, entry) {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const oldest = audioCache.keys().next().value;
    audioCache.delete(oldest);
    console.log(`[Cache] Evicted: ${oldest}`);
  }
  audioCache.set(videoId, entry);
  console.log(
    `[Cache] Stored ${videoId} (${(entry.buffer.length / 1024 / 1024).toFixed(1)} MB). Size: ${audioCache.size}/${MAX_CACHE_SIZE}`
  );
}

// ─── Fetch audio into a Buffer from a direct URL ───────────────────────────
function fetchBuffer(url, contentType) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith("https") ? https : http;
    const chunks = [];

    const req = transport.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.youtube.com/",
        },
      },
      (res) => {
        // Follow redirect
        if (
          (res.statusCode === 301 || res.statusCode === 302) &&
          res.headers.location
        ) {
          fetchBuffer(res.headers.location, contentType)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          reject(new Error(`Upstream returned ${res.statusCode}`));
          return;
        }
        const ct = res.headers["content-type"] || contentType;
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ buffer: Buffer.concat(chunks), contentType: ct.split(";")[0] })
        );
      }
    );

    req.on("error", reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error("Download timed out"));
    });
  });
}

// ─── Controller ─────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  try {
    let entry = cacheGet(videoId);

    if (entry) {
      console.log(`[Cache] HIT for ${videoId}`);
    } else {
      console.log(`[Stream] Extracting URL for ${videoId}...`);
      
      const output = await ydl(`https://www.youtube.com/watch?v=${videoId}`, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:https://www.youtube.com/',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      });


      // Find best audio-only format
      const audioFormat = output.formats
        .filter(f => f.vcodec === 'none' && f.acodec !== 'none')
        .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

      if (!audioFormat || !audioFormat.url) {
        throw new Error("No suitable audio format found");
      }

      console.log(`[Stream] Downloading audio for ${videoId}...`);
      entry = await fetchBuffer(audioFormat.url, audioFormat.ext === 'm4a' ? 'audio/mp4' : 'audio/webm');
      cacheSet(videoId, entry);
    }

    const { buffer, contentType } = entry;
    const total = buffer.length;
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const [s, e] = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(s, 10);
      const end = e
        ? parseInt(e, 10)
        : Math.min(start + 1024 * 1024, total - 1);
      if (start >= total) {
        return res
          .status(416)
          .setHeader("Content-Range", `bytes */${total}`)
          .end();
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": contentType,
      });
      res.end(buffer.slice(start, end + 1));
    } else {
      res.writeHead(200, {
        "Content-Length": total,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      });
      res.end(buffer);
    }
  } catch (err) {
    console.error(`[Stream] Error for ${videoId}:`, err.message);
    if (!res.headersSent)
      res.status(500).json({ message: "Failed to get audio", error: err.message });
  }
};

module.exports = { streamAudio };
