const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getProfile,
  updateProfile,
  getLikedSongs,
  toggleLikedSong,
  getRecentlyPlayed,
  addRecentlyPlayed,
  getHomeFeed,
} = require("../controllers/libraryController");

const router = express.Router();

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.get("/home", protect, getHomeFeed);
router.get("/likes", protect, getLikedSongs);
router.post("/likes/toggle", protect, toggleLikedSong);
router.get("/recent", protect, getRecentlyPlayed);
router.post("/recent", protect, addRecentlyPlayed);

module.exports = router;
