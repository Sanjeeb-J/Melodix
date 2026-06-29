const axios = require("axios");
const Playlist = require("../models/Playlist");

const palette = ["#1DB954", "#477D95", "#8D67AB", "#E8115B", "#BA5D07", "#148A08"];

const getCoverColor = (name = "") => {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
};

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

const durationToSeconds = (duration = "") => {
  const parts = String(duration).split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

const normalizeSongBody = (body) => {
  const videoId = body.videoId || body.youtubeId;
  const title = body.title || body.name;
  const duration = body.durationText || body.duration || "--:--";

  return {
    name: title,
    title,
    artist: body.artist || body.author || "Unknown artist",
    album: body.album || "YouTube",
    duration,
    durationSeconds: Number(body.durationSeconds || 0) || durationToSeconds(duration),
    youtubeId: videoId,
    videoId,
    youtubeLink: body.youtubeLink || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""),
    thumbnail: body.thumbnail || "",
  };
};

const extractYouTubePlaylistId = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.searchParams.get("list") || null;
  } catch (error) {
    return value.match(/[?&]list=([A-Za-z0-9_-]+)/)?.[1] || null;
  }
};

const fetchYouTubePlaylistSongs = async (playlistUrl) => {
  const playlistId = extractYouTubePlaylistId(playlistUrl);
  if (!playlistId) throw new Error("Invalid YouTube playlist URL");
  if (!process.env.YOUTUBE_API_KEY) throw new Error("YouTube API key is missing");

  const playlistMetaResponse = await axios.get("https://www.googleapis.com/youtube/v3/playlists", {
    params: { part: "snippet", id: playlistId, key: process.env.YOUTUBE_API_KEY },
  });

  const playlistTitle = playlistMetaResponse.data.items?.[0]?.snippet?.title;
  if (!playlistTitle) throw new Error("Playlist not found or is not accessible");

  const playlistItems = [];
  let nextPageToken = "";

  do {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
      params: {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken || undefined,
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    playlistItems.push(...response.data.items);
    nextPageToken = response.data.nextPageToken || "";
  } while (nextPageToken);

  const videoIds = playlistItems
    .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  const durationMap = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const videoResponse = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "contentDetails,snippet,status",
        id: videoIds.slice(i, i + 50).join(","),
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    for (const video of videoResponse.data.items || []) {
      if (video.status?.embeddable === false || video.status?.privacyStatus === "private") continue;
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

      const thumbnail =
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "";

      return normalizeSongBody({
        title: details.title || item.snippet?.title || "Unknown title",
        artist: details.artist || item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle,
        duration: details.duration,
        videoId,
        thumbnail,
      });
    })
    .filter(Boolean);

  if (!songs.length) throw new Error("No playable songs were found in that playlist");
  return { playlistTitle, songs };
};

const createPlaylist = async (req, res) => {
  try {
    const { name, importUrl, description } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedImportUrl = typeof importUrl === "string" ? importUrl.trim() : "";

    if (!trimmedName && !trimmedImportUrl) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    let importedSongs = [];
    let resolvedName = trimmedName;

    if (trimmedImportUrl) {
      const imported = await fetchYouTubePlaylistSongs(trimmedImportUrl);
      importedSongs = imported.songs;
      if (!resolvedName) resolvedName = imported.playlistTitle;
    }

    const playlist = await Playlist.create({
      name: resolvedName,
      description: typeof description === "string" ? description.trim() : "",
      coverColor: getCoverColor(resolvedName),
      user: req.user._id,
      songs: importedSongs,
    });

    res.status(201).json({ message: "Playlist created successfully", playlist, importedCount: importedSongs.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPlaylistById = async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    await playlist.deleteOne();
    res.json({ message: "Playlist deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePlaylistName = async (req, res) => {
  try {
    const { name, description, coverColor, isPublic } = req.body;
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });

    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    if (!name && description === undefined && coverColor === undefined && isPublic === undefined) {
      return res.status(400).json({ message: "Playlist update fields are required" });
    }

    if (name) playlist.name = String(name).trim();
    if (description !== undefined) playlist.description = String(description).trim();
    if (coverColor !== undefined) playlist.coverColor = String(coverColor).trim();
    if (isPublic !== undefined) playlist.isPublic = Boolean(isPublic);

    await playlist.save();
    res.json({ message: "Playlist updated successfully", playlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addSongFromYouTube = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const song = normalizeSongBody(req.body);

    if (!song.name || !song.youtubeId) {
      return res.status(400).json({ message: "Invalid song data" });
    }

    const playlist = await Playlist.findOne({ _id: playlistId, user: req.user._id });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    playlist.songs.push(song);
    await playlist.save();
    res.status(201).json({ playlist });
  } catch (error) {
    res.status(500).json({ message: "Failed to add song" });
  }
};

const deleteSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const playlist = await Playlist.findOne({ _id: playlistId, user: req.user._id });

    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    playlist.songs = playlist.songs.filter((song) => {
      const idMatches = song._id.toString() === songId;
      const videoMatches = song.youtubeId === songId || song.videoId === songId;
      return !idMatches && !videoMatches;
    });

    await playlist.save();
    res.json({ message: "Song deleted successfully", playlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSongInPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const { name, title, artist, album, youtubeLink, duration } = req.body;
    const playlist = await Playlist.findOne({ _id: playlistId, user: req.user._id });

    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    const song = playlist.songs.id(songId) || playlist.songs.find((item) => item.youtubeId === songId || item.videoId === songId);
    if (!song) return res.status(404).json({ message: "Song not found" });

    if (name) song.name = name;
    if (title) {
      song.title = title;
      song.name = title;
    }
    if (artist) song.artist = artist;
    if (album) song.album = album;
    if (duration) {
      song.duration = duration;
      song.durationSeconds = durationToSeconds(duration);
    }
    if (youtubeLink) song.youtubeLink = youtubeLink;

    await playlist.save();
    res.json({ message: "Song updated successfully", playlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reorderSongs = async (req, res) => {
  try {
    const { orderedVideoIds } = req.body;
    if (!Array.isArray(orderedVideoIds)) {
      return res.status(400).json({ message: "orderedVideoIds must be an array" });
    }

    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    const byId = new Map();
    playlist.songs.forEach((song) => {
      byId.set(song._id.toString(), song);
      if (song.youtubeId) byId.set(song.youtubeId, song);
      if (song.videoId) byId.set(song.videoId, song);
    });

    const ordered = orderedVideoIds.map((id) => byId.get(id)).filter(Boolean);
    const orderedIds = new Set(ordered.map((song) => song._id.toString()));
    const rest = playlist.songs.filter((song) => !orderedIds.has(song._id.toString()));

    playlist.songs = [...ordered, ...rest];
    await playlist.save();
    res.json({ message: "Playlist reordered", playlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markPlaylistPlayed = async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

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
  getPlaylistById,
  deletePlaylist,
  updatePlaylistName,
  deleteSongFromPlaylist,
  updateSongInPlaylist,
  addSongFromYouTube,
  markPlaylistPlayed,
  reorderSongs,
};
