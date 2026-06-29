const PlayHistory = require("../models/PlayHistory");

const MAX_HISTORY = 500;

const logPlay = async (req, res) => {
  try {
    const { videoId, title, name, artist, author, thumbnail, duration, durationSeconds } = req.body;

    if (!videoId || !(title || name)) {
      return res.status(400).json({ message: "videoId and title are required" });
    }

    const entry = await PlayHistory.create({
      user: req.user._id,
      videoId,
      title: title || name,
      artist: artist || author || "Unknown artist",
      thumbnail: thumbnail || "",
      duration: Number(durationSeconds || duration || 0),
      playedAt: new Date(),
    });

    const oldEntries = await PlayHistory.find({ user: req.user._id })
      .sort({ playedAt: -1 })
      .skip(MAX_HISTORY)
      .select("_id");

    if (oldEntries.length) {
      await PlayHistory.deleteMany({ _id: { $in: oldEntries.map((item) => item._id) } });
    }

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const history = await PlayHistory.find({ user: req.user._id })
      .sort({ playedAt: -1 })
      .limit(limit);

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getHistoryStats = async (req, res) => {
  try {
    const [summary] = await PlayHistory.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalPlays: { $sum: 1 },
          totalSeconds: { $sum: "$duration" },
        },
      },
    ]);

    const topArtists = await PlayHistory.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: "$artist", plays: { $sum: 1 } } },
      { $sort: { plays: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, artist: "$_id", plays: 1 } },
    ]);

    res.json({
      topArtists,
      totalPlays: summary?.totalPlays || 0,
      totalMinutes: Math.round((summary?.totalSeconds || 0) / 60),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { logPlay, getHistory, getHistoryStats };
