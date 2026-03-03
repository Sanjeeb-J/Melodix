const https = require("https");
const http = require("http");

// ─── 10-song LRU Cache ──────────────────────────────────────────────────────
const MAX_CACHE_SIZE = 10;
const audioCache = new Map();

function cacheGet(videoId) {
  if (!audioCache.has(videoId)) return null;
  const entry = audioCache.get(videoId);
  audioCache.delete(videoId);
  audioCache.set(videoId, entry);
  return entry;
}

function cacheSet(videoId, data) {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const oldest = audioCache.keys().next().value;
    audioCache.delete(oldest);
    console.log(`[Cache] Evicted: ${oldest}`);
  }
  audioCache.set(videoId, data);
  console.log(
    `[Stream] Cached ${videoId} (${(data.buffer.length / 1024 / 1024).toFixed(1)} MB). Cache size: ${audioCache.size}`
  );
}

// ─── Convert WHATWG ReadableStream → Node.js Buffer ─────────────────────────
async function readableStreamToBuffer(readableStream) {
  const chunks = [];
  const reader = readableStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

// ─── Innertube singleton per container ──────────────────────────────────────
let ytInstance = null;

async function getYT() {
  if (!ytInstance) {
    const { Innertube } = await import("youtubei.js");
    ytInstance = await Innertube.create({ retrieve_player: true });
    console.log("[Stream] Innertube initialized");
  }
  return ytInstance;
}

// ─── Controller ─────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  try {
    // ── Cache hit ──────────────────────────────────────────────────────────
    let entry = cacheGet(videoId);

    if (entry) {
      console.log(`[Cache] HIT for ${videoId}`);
    } else {
      // ── Extract and download audio ────────────────────────────────────────
      console.log(`[Stream] Downloading audio for ${videoId}...`);
      const yt = await getYT();

      const stream = await yt.download(videoId, {
        type: "audio",
        quality: "best",
        format: "any",
      });

      const buffer = await readableStreamToBuffer(stream);
      if (!buffer || buffer.length === 0) {
        throw new Error("Downloaded audio is empty");
      }

      entry = { buffer, contentType: "audio/mp4" };
      cacheSet(videoId, entry);
    }

    // ── Serve buffer with Range support ──────────────────────────────────────
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
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to get audio", error: err.message });
    }
  }
};

module.exports = { streamAudio };
