const mongoose = require("mongoose");

const recentSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    searchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

recentSearchSchema.index({ user: 1, searchedAt: -1 });

module.exports = mongoose.model("RecentSearch", recentSearchSchema);
