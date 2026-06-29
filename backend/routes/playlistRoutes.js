const express = require("express");
const {
  createPlaylist,
  getPlaylistById,
  getUserPlaylists,
  deletePlaylist,
  updatePlaylistName,
  deleteSongFromPlaylist,
  updateSongInPlaylist,
  addSongFromYouTube,
  markPlaylistPlayed,
  reorderSongs,
} = require("../controllers/playlistController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createPlaylist);
router.get("/", protect, getUserPlaylists);
router.get("/:id", protect, getPlaylistById);
router.delete("/:id", protect, deletePlaylist);
router.put("/:id", protect, updatePlaylistName);
router.put("/:id/play", protect, markPlaylistPlayed);
router.put("/:id/reorder", protect, reorderSongs);
router.delete("/:playlistId/songs/:songId", protect, deleteSongFromPlaylist);
router.put("/:playlistId/songs/:songId", protect, updateSongInPlaylist);
router.post("/:playlistId/songs", protect, addSongFromYouTube);

module.exports = router;
