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
    const chunks = [];
    const makeRequest = (targetUrl) => {
      const transport = targetUrl.startsWith("https") ? https : http;
      transport.get(
        targetUrl,
        {
          headers: {
            "User-Agent":
              "com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip",
            Referer: "https://www.youtube.com/",
          },
        },
        (res) => {
          if (
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location
          ) {
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
            resolve({ buffer: Buffer.concat(chunks), contentType: contentType.split(";")[0] })
          );
          res.on("error", reject);
        }
      ).on("error", reject);
    };
    makeRequest(url);
  });
}

// ─── Innertube singleton (lazy loaded as ESM) ───────────────────────────────
let innertubeInstance = null;

async function getInnertube() {
  if (!innertubeInstance) {
    // Dynamic import because youtubei.js is ESM-only
    const { Innertube } = await import("youtubei.js");
    innertubeInstance = await Innertube.create({
      retrieve_player: true,
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
      console.log(`[Stream] Fetching info for ${videoId}...`);
      const yt = await getInnertube();

      // getInfo with ANDROID client gives direct (non-throttled) URLs
      const info = await yt.getInfo(videoId, "ANDROID");

      // Pick best audio-only format
      const format = info.chooseFormat({
        quality: "best",
        type: "audio",
        format: "any",
      });

      if (!format) throw new Error("No audio format found");

      // Try direct URL first, otherwise decipher
      let audioUrl = format.url;
      if (!audioUrl && yt.session.player) {
        audioUrl = format.decipher(yt.session.player);
      }
      if (!audioUrl) throw new Error("Could not resolve audio URL");

      console.log(`[Stream] Downloading audio for ${videoId} (${format.audio_quality})...`);
      entry = await fetchBuffer(audioUrl);
      cacheSet(videoId, entry);
    }

    const { buffer, contentType } = entry;
    const total = buffer.length;
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const [s, e] = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(s, 10);
      const end = e ? parseInt(e, 10) : Math.min(start + 1024 * 1024, total - 1);
      if (start >= total) {
        return res.status(416).setHeader("Content-Range", `bytes */${total}`).end();
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
