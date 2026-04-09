const User = require("../models/User");
const Playlist = require("../models/Playlist");

const MAX_RECENT_ITEMS = 30;

const normalizeTrackPayload = (input = {}) => {
  const youtubeId = input.youtubeId || input.videoId;
  const name = input.name || input.title;

  if (!youtubeId || !name) {
    return null;
  }

  return {
    name,
    artist: input.artist || "Unknown artist",
    album: input.album || "Single",
    duration: input.duration || "--:--",
    youtubeId,
    youtubeLink: input.youtubeLink || `https://www.youtube.com/watch?v=${youtubeId}`,
    thumbnail: input.thumbnail || "https://placehold.co/300x300/111111/FFFFFF?text=Melodix",
    source: input.source || "youtube",
    likedAt: input.likedAt || new Date(),
  };
};

const getProfile = async (req, res) => {
  try {
    const [user, playlists] = await Promise.all([
      User.findById(req.user._id).select("-password"),
      Playlist.find({ user: req.user._id }).sort({ updatedAt: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const playlistSongs = playlists.flatMap((playlist) => playlist.songs || []);
    const listeningNow = user.recentlyPlayed.slice(0, 5);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarColor: user.avatarColor,
        favoriteGenres: user.favoriteGenres,
        createdAt: user.createdAt,
      },
      stats: {
        playlists: playlists.length,
        likedSongs: user.likedSongs.length,
        recentlyPlayed: user.recentlyPlayed.length,
        libraryTracks: playlistSongs.length,
      },
      spotlight: {
        latestPlaylists: playlists.slice(0, 4),
        listeningNow,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, bio, avatarColor, favoriteGenres } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (typeof bio === "string") {
      user.bio = bio.trim().slice(0, 240);
    }

    if (typeof avatarColor === "string" && avatarColor.trim()) {
      user.avatarColor = avatarColor.trim();
    }

    if (Array.isArray(favoriteGenres)) {
      user.favoriteGenres = favoriteGenres
        .map((genre) => String(genre).trim())
        .filter(Boolean)
        .slice(0, 8);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarColor: user.avatarColor,
        favoriteGenres: user.favoriteGenres,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLikedSongs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("likedSongs");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.likedSongs.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleLikedSong = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const track = normalizeTrackPayload(req.body);
    if (!track) {
      return res.status(400).json({ message: "A valid track payload is required" });
    }

    const existingIndex = user.likedSongs.findIndex(
      (song) => song.youtubeId === track.youtubeId
    );

    let liked = false;
    if (existingIndex >= 0) {
      user.likedSongs.splice(existingIndex, 1);
    } else {
      user.likedSongs.unshift(track);
      liked = true;
    }

    await user.save();

    res.json({
      liked,
      likedSongs: user.likedSongs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRecentlyPlayed = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("recentlyPlayed");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const recent = user.recentlyPlayed
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, MAX_RECENT_ITEMS);

    res.json(recent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addRecentlyPlayed = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const track = normalizeTrackPayload(req.body.track || req.body);
    if (!track) {
      return res.status(400).json({ message: "A valid track payload is required" });
    }

    user.recentlyPlayed = user.recentlyPlayed.filter(
      (entry) => entry.track.youtubeId !== track.youtubeId
    );

    user.recentlyPlayed.unshift({
      track,
      contextType: req.body.contextType || "search",
      contextId: req.body.contextId || "",
      playedAt: new Date(),
    });

    user.recentlyPlayed = user.recentlyPlayed.slice(0, MAX_RECENT_ITEMS);

    await user.save();

    res.status(201).json({
      message: "Track added to recently played",
      recentlyPlayed: user.recentlyPlayed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getHomeFeed = async (req, res) => {
  try {
    const [user, playlists] = await Promise.all([
      User.findById(req.user._id).select("likedSongs recentlyPlayed favoriteGenres"),
      Playlist.find({ user: req.user._id }).sort({ updatedAt: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const likedSongs = user.likedSongs.slice(0, 8);
    const recentTracks = user.recentlyPlayed.slice(0, 8).map((entry) => entry.track);

    const uniqueRecommendations = [...likedSongs, ...recentTracks].filter(
      (track, index, array) =>
        array.findIndex((item) => item.youtubeId === track.youtubeId) === index
    );

    const featuredPlaylists = playlists.slice(0, 6).map((playlist) => ({
      ...playlist.toObject(),
      coverImage:
        playlist.coverImage ||
        playlist.songs?.[0]?.thumbnail ||
        "https://placehold.co/500x500/111111/FFFFFF?text=Playlist",
    }));

    res.json({
      greeting: {
        title: "Your upgraded Melodix home",
        subtitle: "A Spotify-style mix of favorites, fresh picks, and your library.",
      },
      sections: {
        quickAccess: featuredPlaylists,
        likedSongs,
        recentlyPlayed: user.recentlyPlayed.slice(0, 10),
        recommendations: uniqueRecommendations.slice(0, 12),
        genres: user.favoriteGenres,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getLikedSongs,
  toggleLikedSong,
  getRecentlyPlayed,
  addRecentlyPlayed,
  getHomeFeed,
};
