const LikedSong = require("../models/LikedSong");

const normalizeSong = (videoId, body) => ({
  videoId,
  title: body.title || body.name || "Untitled",
  artist: body.artist || body.author || "Unknown artist",
  thumbnail: body.thumbnail || "",
  duration: Number(body.duration || body.durationSeconds || 0),
});

const getLikedSongs = async (req, res) => {
  try {
    const songs = await LikedSong.find({ user: req.user._id }).sort({ likedAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const likeSong = async (req, res) => {
  try {
    const { videoId } = req.params;
    const song = normalizeSong(videoId, req.body);

    const liked = await LikedSong.findOneAndUpdate(
      { user: req.user._id, videoId },
      { $set: { ...song, user: req.user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(liked);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unlikeSong = async (req, res) => {
  try {
    await LikedSong.deleteOne({ user: req.user._id, videoId: req.params.videoId });
    res.json({ message: "Song unliked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLikedStatus = async (req, res) => {
  try {
    const liked = await LikedSong.exists({ user: req.user._id, videoId: req.params.videoId });
    res.json({ liked: Boolean(liked) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getLikedSongs, likeSong, unlikeSong, getLikedStatus };
