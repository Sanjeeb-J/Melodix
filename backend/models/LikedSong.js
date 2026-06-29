const mongoose = require("mongoose");

const likedSongSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artist: {
      type: String,
      trim: true,
      default: "Unknown artist",
    },
    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: { createdAt: "likedAt", updatedAt: "updatedAt" } }
);

likedSongSchema.index({ user: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("LikedSong", likedSongSchema);
