const axios = require("axios");

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

    // 1️⃣ SEARCH API
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

    // 2️⃣ VIDEOS API (for duration)
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

    // 3️⃣ MERGE RESULT
    const results = items.map((item) => ({
      title: item.snippet.title,
      artist: item.snippet.channelTitle, // ✅ FIXED
      thumbnail: item.snippet.thumbnails.medium.url,
      videoId: item.id.videoId,
      youtubeLink: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      duration: durationMap[item.id.videoId] || "--:--", // ✅ FIXED
    }));

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "YouTube search failed" });
  }
};

module.exports = { searchYouTube };
