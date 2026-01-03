const express = require("express");
const {
  createPlaylist,
  getUserPlaylists,
  deletePlaylist,
  updatePlaylistName,
  deleteSongFromPlaylist,
  updateSongInPlaylist,
  addSongFromYouTube,
} = require("../controllers/playlistController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createPlaylist);
router.get("/", protect, getUserPlaylists);
router.delete("/:id", protect, deletePlaylist);
router.put("/:id", protect, updatePlaylistName);
router.delete("/:playlistId/songs/:songId", protect, deleteSongFromPlaylist);
router.put("/:playlistId/songs/:songId", protect, updateSongInPlaylist);
router.post("/:playlistId/songs", protect, addSongFromYouTube);

module.exports = router;
