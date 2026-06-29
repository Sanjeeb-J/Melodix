const PlayHistory = require("../models/PlayHistory");
const Playlist = require("../models/Playlist");
const User = require("../models/User");

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("name email createdAt displayName avatarColor");
    const [summary] = await PlayHistory.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: null, totalPlays: { $sum: 1 }, totalSeconds: { $sum: "$duration" } } },
    ]);
    const playlistCount = await Playlist.countDocuments({ user: req.user._id });

    res.json({
      id: req.user._id,
      email: user?.email || "",
      name: user?.name || "",
      displayName: user?.displayName || user?.name || "",
      avatarColor: user?.avatarColor || "#1DB954",
      joinedAt: user?.createdAt,
      totalPlays: summary?.totalPlays || 0,
      totalMinutes: Math.round((summary?.totalSeconds || 0) / 60),
      playlistCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.displayName === "string") updates.displayName = req.body.displayName.trim();
    if (typeof req.body.avatarColor === "string") updates.avatarColor = req.body.avatarColor.trim();

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProfile, updateProfile };
