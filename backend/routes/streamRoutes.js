const express = require("express");
const router = express.Router();
const { streamAudio } = require("../controllers/streamController");
const auth = require("../middleware/auth");

// GET /api/stream/:videoId
router.get("/:videoId", auth, streamAudio);

module.exports = router;
