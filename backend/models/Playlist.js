const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    artist: {
      type: String,
      trim: true,
    },
    album: {
      type: String,
      trim: true,
    },
    youtubeLink: {
      type: String,
      required: true,
    },
    youtubeId: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
    },
  },
  { timestamps: true }
);

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    songs: [songSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Playlist", playlistSchema);
