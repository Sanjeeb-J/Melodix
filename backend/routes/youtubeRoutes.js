const express = require("express");
const {
  searchYouTube,
  searchMusic,
  getPlaylistTracks,
  getAlbumTracks,
  getArtistTracks,
} = require("../controllers/youtubeController");
const { protect } = require("../middleware/authMiddleware");
const { searchLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Search songs on YouTube
// - protect: requires valid JWT
// - searchLimiter: max 15 requests per user per minute (quota protection)
router.get("/search", protect, searchLimiter, searchYouTube);
router.get("/search/music", protect, searchLimiter, searchMusic);
router.get("/playlist/:playlistId", protect, searchLimiter, getPlaylistTracks);
router.get("/album/:browseId", protect, searchLimiter, getAlbumTracks);
router.get("/artist/:browseId", protect, searchLimiter, getArtistTracks);

module.exports = router;
