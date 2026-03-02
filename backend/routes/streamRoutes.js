const express = require("express");
const router = express.Router();
const { streamAudio } = require("../controllers/streamController");
const { protect } = require("../middleware/authMiddleware");

// GET /api/stream/:videoId
router.get("/:videoId", protect, streamAudio);

module.exports = router;
