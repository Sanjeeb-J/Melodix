const ytdl = require("@distube/ytdl-core");

// ─── 10-song LRU Cache ─────────────────────────────────────────────────────
const MAX_CACHE_SIZE = 10;
// key: videoId, value: { buffer: Buffer, contentType: string }
const audioCache = new Map();

function cacheGet(videoId) {
  if (!audioCache.has(videoId)) return null;
  // Refresh recency: delete then re-insert so it's newest in iteration order
  const entry = audioCache.get(videoId);
  audioCache.delete(videoId);
  audioCache.set(videoId, entry);
  return entry;
}

function cacheSet(videoId, entry) {
  // Evict oldest if full
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = audioCache.keys().next().value;
    audioCache.delete(oldestKey);
    console.log(`[Cache] Evicted oldest: ${oldestKey}. Cache size: ${audioCache.size}`);
  }
  audioCache.set(videoId, entry);
  console.log(`[Cache] Stored ${videoId}. Cache size: ${audioCache.size}/${MAX_CACHE_SIZE}`);
}

// ─── Download helper ────────────────────────────────────────────────────────
function downloadToBuffer(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const chunks = [];

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    });

    let contentType = "audio/webm";

    stream.on("info", (_info, format) => {
      if (format.mimeType) contentType = format.mimeType.split(";")[0];
    });

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType }));
    stream.on("error", reject);
  });
}

// ─── Controller ─────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required" });
  }

  try {
    // 1. Check cache
    let entry = cacheGet(videoId);

    if (entry) {
      console.log(`[Cache] HIT for ${videoId}`);
    } else {
      // 2. Download
      console.log(`[Download] Fetching audio for ${videoId}...`);
      entry = await downloadToBuffer(videoId);
      cacheSet(videoId, entry);
      console.log(`[Download] Done for ${videoId} — ${(entry.buffer.length / 1024 / 1024).toFixed(1)} MB`);
    }

    const { buffer, contentType } = entry;
    const totalSize = buffer.length;

    // 3. Support Range requests so the browser can seek
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024, totalSize - 1);

      if (start >= totalSize) {
        res.status(416).setHeader("Content-Range", `bytes */${totalSize}`).end();
        return;
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": contentType,
      });
      res.end(buffer.slice(start, end + 1));
    } else {
      res.writeHead(200, {
        "Content-Length": totalSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      });
      res.end(buffer);
    }
  } catch (err) {
    console.error(`[Stream] Error for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to get audio", error: err.message });
    }
  }
};

module.exports = { streamAudio };

