const mongoose = require("mongoose");

const librarySongSchema = new mongoose.Schema(
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
      default: "--:--",
    },
    source: {
      type: String,
      default: "youtube",
    },
    likedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const recentPlaySchema = new mongoose.Schema(
  {
    track: {
      type: librarySongSchema,
      required: true,
    },
    contextType: {
      type: String,
      default: "search",
    },
    contextId: {
      type: String,
      default: "",
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatarColor: {
      type: String,
      default: "#1db954",
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    likedSongs: [librarySongSchema],
    recentlyPlayed: [recentPlaySchema],
    favoriteGenres: {
      type: [String],
      default: ["pop", "indie", "electronic"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
