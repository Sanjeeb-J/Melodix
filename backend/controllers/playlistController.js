const axios = require("axios");
const Playlist = require("../models/Playlist");

const formatDuration = (iso) => {
  if (!iso) return "--:--";

  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = Number(match?.[1] || 0);
  const minutes = Number(match?.[2] || 0);
  const seconds = Number(match?.[3] || 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const extractYouTubePlaylistId = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    const listId = url.searchParams.get("list");
    return listId || null;
  } catch (error) {
    const match = value.match(/[?&]list=([A-Za-z0-9_-]+)/);
    return match?.[1] || null;
  }
};

const fetchYouTubePlaylistSongs = async (playlistUrl) => {
  const playlistId = extractYouTubePlaylistId(playlistUrl);

  if (!playlistId) {
    throw new Error("Invalid YouTube playlist URL");
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API key is missing");
  }

  const playlistMetaResponse = await axios.get(
    "https://www.googleapis.com/youtube/v3/playlists",
    {
      params: {
        part: "snippet",
        id: playlistId,
        key: apiKey,
      },
    }
  );

  const playlistTitle = playlistMetaResponse.data.items?.[0]?.snippet?.title;
  if (!playlistTitle) {
    throw new Error("Playlist not found or is not accessible");
  }

  const playlistItems = [];
  let nextPageToken = "";

  do {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/playlistItems",
      {
        params: {
          part: "snippet,contentDetails",
          playlistId,
          maxResults: 50,
          pageToken: nextPageToken || undefined,
          key: apiKey,
        },
      }
    );

    playlistItems.push(...response.data.items);
    nextPageToken = response.data.nextPageToken || "";
  } while (nextPageToken);

  const videoIds = playlistItems
    .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  const durationMap = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const videoResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          part: "contentDetails,snippet,status",
          id: chunk.join(","),
          key: apiKey,
        },
      }
    );

    for (const video of videoResponse.data.items || []) {
      const isEmbeddable = video.status?.embeddable !== false;
      const isPublic = video.status?.privacyStatus !== "private";

      if (!isEmbeddable || !isPublic) continue;

      durationMap[video.id] = {
        duration: formatDuration(video.contentDetails?.duration),
        title: video.snippet?.title,
        artist: video.snippet?.channelTitle,
      };
    }
  }

  const songs = playlistItems
    .map((item) => {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const details = durationMap[videoId];
      if (!videoId || !details) return null;

      const thumb =
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url;

      if (!thumb) return null;

      return {
        name: details.title || item.snippet?.title || "Unknown title",
        artist: details.artist || item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "Unknown artist",
        album: "YouTube",
        duration: details.duration,
        youtubeId: videoId,
        youtubeLink: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: thumb,
      };
    })
    .filter(Boolean);

  if (!songs.length) {
    throw new Error("No playable songs were found in that playlist");
  }

  return { playlistTitle, songs };
};

const fetchImportedSongs = async (importUrl) => {
  return fetchYouTubePlaylistSongs(importUrl);
};

// CREATE PLAYLIST
const createPlaylist = async (req, res) => {
  try {
    const { name, importUrl } = req.body;

    if (!name?.trim() && !importUrl?.trim()) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    let importedSongs = [];
    let resolvedName = name?.trim();

    if (importUrl) {
      const imported = await fetchImportedSongs(importUrl);
      importedSongs = imported.songs;
      if (!resolvedName) {
        resolvedName = imported.playlistTitle;
      }
    }

    const playlist = await Playlist.create({
      name: resolvedName,
      user: req.user._id, // comes from auth middleware
      songs: importedSongs,
    });

    res.status(201).json({
      message: "Playlist created successfully",
      playlist,
      importedCount: importedSongs.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET USER PLAYLISTS
const getUserPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id }).sort({
      updatedAt: -1,
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

// MARK PLAYLIST AS PLAYED (UPDATE TIMESTAMP)
const markPlaylistPlayed = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Ensure ownership
    if (playlist.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Trigger updatedAt update
    playlist.markModified("songs"); 
    await playlist.save();

    res.json({ message: "Playlist timestamp updated" });
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
  markPlaylistPlayed,
};
