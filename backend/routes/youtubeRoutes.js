const express = require("express");
const { searchYouTube } = require("../controllers/youtubeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Search songs on YouTube
router.get("/search", protect, searchYouTube);

module.exports = router;
