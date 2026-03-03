const axios = require("axios");

// Multiple Piped API instances for redundancy
const PIPED_APIS = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://piped-api.garudalinux.org",
  "https://api.piped.yt",
];

// URL cache: { url, mimeType, ts } per videoId (5-min TTL)
const urlCache = new Map();
const URL_TTL = 5 * 60 * 1000;

async function getAudioUrl(videoId) {
  const cached = urlCache.get(videoId);
  if (cached && Date.now() - cached.ts < URL_TTL) {
    console.log(`[Cache] URL HIT for ${videoId}`);
    return cached;
  }

  for (const api of PIPED_APIS) {
    try {
      console.log(`[Piped] Trying ${api} for ${videoId}...`);
      const { data } = await axios.get(`${api}/streams/${videoId}`, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 Melodix/1.0" },
      });

      if (!data.audioStreams?.length) continue;

      // Pick highest-bitrate stream
      const best = data.audioStreams
        .filter((s) => s.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

      if (best?.url) {
        const entry = {
          url: best.url,
          mimeType: best.mimeType || "audio/webm",
          ts: Date.now(),
        };
        urlCache.set(videoId, entry);
        console.log(`[Piped] Got URL for ${videoId} from ${api}`);
        return entry;
      }
    } catch (e) {
      console.warn(`[Piped] ${api} failed: ${e.message}`);
    }
  }

  throw new Error("All Piped instances failed to get stream URL");
}

// ─── Controller ─────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  try {
    const { url, mimeType } = await getAudioUrl(videoId);

    // Return the audio URL as JSON — frontend sets audio.src directly
    // This avoids any server-side buffering or bandwidth issues
    res.json({ audioUrl: url, mimeType });
  } catch (err) {
    console.error(`[Stream] Error for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to get audio", error: err.message });
    }
  }
};

module.exports = { streamAudio };
