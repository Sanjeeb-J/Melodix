const RecentSearch = require("../models/RecentSearch");

const MAX_RECENT_SEARCHES = 10;

const logSearch = async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();
    if (!query) return res.status(400).json({ message: "query is required" });

    await RecentSearch.deleteMany({ user: req.user._id, query: new RegExp(`^${query}$`, "i") });
    const entry = await RecentSearch.create({ user: req.user._id, query, searchedAt: new Date() });

    const oldEntries = await RecentSearch.find({ user: req.user._id })
      .sort({ searchedAt: -1 })
      .skip(MAX_RECENT_SEARCHES)
      .select("_id");

    if (oldEntries.length) {
      await RecentSearch.deleteMany({ _id: { $in: oldEntries.map((item) => item._id) } });
    }

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRecentSearches = async (req, res) => {
  try {
    const searches = await RecentSearch.find({ user: req.user._id })
      .sort({ searchedAt: -1 })
      .limit(MAX_RECENT_SEARCHES);
    res.json(searches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearRecentSearches = async (req, res) => {
  try {
    await RecentSearch.deleteMany({ user: req.user._id });
    res.json({ message: "Recent searches cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { logSearch, getRecentSearches, clearRecentSearches };
