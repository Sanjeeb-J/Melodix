const { Innertube } = require("youtubei.js");
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
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith("https") ? https : http;
    const chunks = [];

    const makeRequest = (targetUrl) => {
      transport.get(
        targetUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Referer: "https://www.youtube.com/",
            "Range": "bytes=0-",
          },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            makeRequest(res.headers.location);
            return;
          }
          if (res.statusCode !== 200 && res.statusCode !== 206) {
            reject(new Error(`Upstream returned ${res.statusCode}`));
            return;
          }
          const contentType = res.headers["content-type"] || "audio/mp4";
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: contentType.split(";")[0],
            })
          );
          res.on("error", reject);
        }
      );
    };

    const req = transport.get(url, {}, () => {});
    req.setTimeout(90000, () => {
      req.destroy();
      reject(new Error("Download timed out"));
    });
    req.on("error", reject);
    req.destroy();

    makeRequest(url);
  });
}

// Single shared Innertube instance
let innertubeInstance = null;
async function getInnertube() {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create({
      cache: null,
      generate_session_locally: true,
    });
  }
  return innertubeInstance;
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
      console.log(`[Stream] Extracting audio URL for ${videoId}...`);

      const yt = await getInnertube();
      const info = await yt.getBasicInfo(videoId);

      // Get the best audio-only format
      const format = info.chooseFormat({
        quality: "best",
        type: "audio",
        format: "any",
      });

      if (!format || !format.url) {
        throw new Error("No suitable audio format found");
      }

      console.log(
        `[Stream] Downloading audio for ${videoId} (${format.audio_quality || "unknown quality"})...`
      );
      entry = await fetchBuffer(format.url);
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
      res
        .status(500)
        .json({ message: "Failed to get audio", error: err.message });
  }
};

module.exports = { streamAudio };
