const express = require("express");
const { searchYouTube } = require("../controllers/youtubeController");
const { protect } = require("../middleware/authMiddleware");
const { searchLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Search songs on YouTube
// - protect: requires valid JWT
// - searchLimiter: max 15 requests per user per minute (quota protection)
router.get("/search", protect, searchLimiter, searchYouTube);

module.exports = router;
