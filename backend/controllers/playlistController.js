const Playlist = require("../models/Playlist");

// CREATE PLAYLIST
const createPlaylist = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    const playlist = await Playlist.create({
      name,
      user: req.user._id, // comes from auth middleware
      songs: [],
    });

    res.status(201).json({
      message: "Playlist created successfully",
      playlist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET USER PLAYLISTS
const getUserPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE PLAYLIST
const deletePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Ensure ownership
    if (playlist.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await playlist.deleteOne();

    res.json({ message: "Playlist deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PLAYLIST NAME
const updatePlaylistName = async (req, res) => {
  try {
    const { name } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Ensure ownership
    if (playlist.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!name) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    playlist.name = name;
    await playlist.save();

    res.json({
      message: "Playlist name updated successfully",
      playlist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADD SONG FROM YOUTUBE SEARCH RESULT
const addSongFromYouTube = async (req, res) => {
  try {
    const { playlistId } = req.params;

    const { name, artist, album, duration, youtubeId, youtubeLink, thumbnail } =
      req.body;

    if (!name || !youtubeId) {
      return res.status(400).json({ message: "Invalid song data" });
    }

    const playlist = await Playlist.findOne({
      _id: playlistId,
      user: req.user._id,
    });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    playlist.songs.push({
      name,
      artist,
      album,
      duration: duration || "--:--", // ✅ SAVE DURATION
      youtubeId,
      youtubeLink,
      thumbnail,
    });

    await playlist.save();

    res.status(201).json({ playlist });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add song" });
  }
};

// DELETE SONG FROM PLAYLIST
const deleteSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Ensure ownership
    if (playlist.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Filter out the song
    playlist.songs = playlist.songs.filter((s) => s._id.toString() !== songId);

    await playlist.save();

    res.json({
      message: "Song deleted successfully",
      playlist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE SONG IN PLAYLIST
const updateSongInPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const { name, artist, album, youtubeLink, duration } = req.body;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Ensure ownership
    if (playlist.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const song = playlist.songs.id(songId);

    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    if (name) song.name = name;
    if (artist) song.artist = artist;
    if (album) song.album = album;
    if (duration) song.duration = duration;
    if (youtubeLink) song.youtubeLink = youtubeLink;

    await playlist.save();

    res.json({
      message: "Song updated successfully",
      playlist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPlaylist,
  getUserPlaylists,
  deletePlaylist,
  updatePlaylistName,
  deleteSongFromPlaylist,
  updateSongInPlaylist,
  addSongFromYouTube,
};
