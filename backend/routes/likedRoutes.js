const express = require("express");
const {
  getLikedSongs,
  likeSong,
  unlikeSong,
  getLikedStatus,
} = require("../controllers/likedController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getLikedSongs);
router.post("/:videoId", protect, likeSong);
router.delete("/:videoId", protect, unlikeSong);
router.get("/:videoId/status", protect, getLikedStatus);

module.exports = router;
