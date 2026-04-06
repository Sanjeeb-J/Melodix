const axios = require("axios");
const { getCached, setCached, getCacheStats } = require("../utils/searchCache");

const formatDuration = (iso) => {
  if (!iso) return "--:--";

  const match = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  const minutes = match?.[1] ?? 0;
  const seconds = match?.[2] ?? 0;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const searchYouTube = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // ─── 1️⃣ Check cache first (saves 101 quota units per cache hit) ──────────
    const cached = getCached(query);
    if (cached) {
      console.log(`[YouTube Cache HIT] "${query}" — served from cache | Cache size: ${getCacheStats().size}`);
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    console.log(`[YouTube Cache MISS] "${query}" — calling YouTube API`);
    res.setHeader("X-Cache", "MISS");

    // ─── 2️⃣ SEARCH API (100 quota units) ─────────────────────────────────────
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: query,
          type: "video",
          maxResults: 5,
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    const items = searchResponse.data.items;

    const videoIds = items.map((i) => i.id.videoId).join(",");

    // ─── 3️⃣ VIDEOS API (1 quota unit per video, batched) ─────────────────────
    const videoResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          part: "contentDetails",
          id: videoIds,
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    const durationMap = {};
    videoResponse.data.items.forEach((v) => {
      durationMap[v.id] = formatDuration(v.contentDetails.duration);
    });

    // ─── 4️⃣ MERGE RESULT ─────────────────────────────────────────────────────
    const results = items.map((item) => ({
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      videoId: item.id.videoId,
      youtubeLink: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      duration: durationMap[item.id.videoId] || "--:--",
    }));

    // ─── 5️⃣ Save to cache ─────────────────────────────────────────────────────
    setCached(query, results);
    console.log(`[YouTube Cache] Cached "${query}" | Cache size now: ${getCacheStats().size}`);

    res.json(results);
  } catch (error) {
    console.error("[YouTube] Search error:", error?.response?.data || error.message);
    res.status(500).json({ message: "YouTube search failed" });
  }
};

module.exports = { searchYouTube };
