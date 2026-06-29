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
    title: {
      type: String,
      trim: true,
    },
    videoId: {
      type: String,
      trim: true,
    },
    youtubeLink: {
      type: String,
      default: "",
    },
    youtubeId: {
      type: String,
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
    },
    durationSeconds: {
      type: Number,
      default: 0,
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
    },
    songs: [songSchema],
    description: {
      type: String,
      trim: true,
      default: "",
    },
    coverColor: {
      type: String,
      trim: true,
      default: "#1DB954",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

playlistSchema.pre("save", function calculateTotalDuration(next) {
  this.totalDuration = this.songs.reduce((total, song) => {
    if (typeof song.durationSeconds === "number" && song.durationSeconds > 0) {
      return total + song.durationSeconds;
    }

    const duration = String(song.duration || "");
    const parts = duration.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return total;

    if (parts.length === 3) return total + parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return total + parts[0] * 60 + parts[1];
    return total;
  }, 0);
  next();
});

module.exports = mongoose.model("Playlist", playlistSchema);
