const express = require("express");
const router = express.Router();
const { streamAudio, debugStream } = require("../controllers/streamController");
const { protect } = require("../middleware/authMiddleware");

// GET /api/stream/:videoId
router.get("/:videoId", protect, streamAudio);

// GET /api/stream/debug/:videoId (unprotected for easy testing)
router.get("/debug/:videoId", debugStream);

module.exports = router;
