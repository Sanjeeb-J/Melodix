const mongoose = require("mongoose");

const playHistorySchema = new mongoose.Schema(
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
    playedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

playHistorySchema.index({ user: 1, playedAt: -1 });

module.exports = mongoose.model("PlayHistory", playHistorySchema);
