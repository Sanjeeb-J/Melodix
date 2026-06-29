const express = require("express");
const { getRecommendations, getSimilarSongs } = require("../controllers/recommendController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getRecommendations);
router.get("/similar/:videoId", protect, getSimilarSongs);

module.exports = router;
