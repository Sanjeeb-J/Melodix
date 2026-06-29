const axios = require("axios");
const PlayHistory = require("../models/PlayHistory");
const RecentSearch = require("../models/RecentSearch");

const recommendationCache = new Map();
const CACHE_MS = 30 * 60 * 1000;

const mapYouTubeItem = (item) => ({
  videoId: item.id?.videoId || item.id || "",
  title: item.snippet?.title || item.title || "Untitled",
  artist: item.snippet?.channelTitle || item.artist || "YouTube Music",
  thumbnail:
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.high?.url ||
    item.thumbnail ||
    "",
  duration: 0,
  type: "song",
});

const searchYouTube = async (query, maxResults = 6) => {
  if (!process.env.YOUTUBE_API_KEY) return [];

  const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
    params: {
      part: "snippet",
      q: query,
      type: "video",
      videoCategoryId: "10",
      maxResults,
      key: process.env.YOUTUBE_API_KEY,
    },
  });

  return (response.data.items || []).map(mapYouTubeItem).filter((item) => item.videoId);
};

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const getRecommendations = async (req, res) => {
  try {
    const cacheKey = String(req.user._id);
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_MS) {
      return res.json({ items: cached.items, cached: true });
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const topArtists = await PlayHistory.aggregate([
      { $match: { user: req.user._id, playedAt: { $gte: since } } },
      { $group: { _id: "$artist", plays: { $sum: 1 } } },
      { $sort: { plays: -1 } },
      { $limit: 5 },
    ]);

    const recentSearches = await RecentSearch.find({ user: req.user._id })
      .sort({ searchedAt: -1 })
      .limit(5);

    const playedToday = await PlayHistory.find({
      user: req.user._id,
      playedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }).select("videoId");
    const playedTodayIds = new Set(playedToday.map((item) => item.videoId));

    const queries = [
      ...topArtists.map((item) => `${item._id} new songs`),
      ...recentSearches.map((item) => item.query),
      "trending music",
    ].filter(Boolean);

    const results = [];
    for (const query of queries) {
      try {
        results.push(...(await searchYouTube(query, 4)));
      } catch (error) {
        console.warn(`[Recommend] YouTube search failed for "${query}": ${error.message}`);
      }
    }

    const byVideoId = new Map();
    for (const item of results) {
      if (!playedTodayIds.has(item.videoId)) byVideoId.set(item.videoId, item);
    }

    const items = shuffle([...byVideoId.values()]).slice(0, 30);
    recommendationCache.set(cacheKey, { createdAt: Date.now(), items });
    res.json({ items, cached: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSimilarSongs = async (req, res) => {
  try {
    const source = await PlayHistory.findOne({ user: req.user._id, videoId: req.params.videoId }).sort({ playedAt: -1 });
    const query = source ? `${source.artist} similar songs` : "similar songs";
    const items = await searchYouTube(query, 12);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRecommendations, getSimilarSongs };
