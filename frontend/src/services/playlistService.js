// ─── Playlist Service ──────────────────────────────────────────────────────────
// Includes localStorage caching for getPlaylists (5-minute TTL).
// All mutation functions (create, add, delete, update) invalidate the cache
// so the next fetch always returns fresh data.

const API_URL = `${import.meta.env.VITE_API_URL}/api/playlists`;

const CACHE_KEY = "melodix_playlists_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Cache helpers ────────────────────────────────────────────────────────────

const getCachedPlaylists = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCachedPlaylists = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage might be full — fail silently
  }
};

const invalidatePlaylistCache = () => {
  localStorage.removeItem(CACHE_KEY);
};

// ─── API functions ────────────────────────────────────────────────────────────

export const getPlaylists = async () => {
  const token = localStorage.getItem("token");

  // ✅ Serve from cache if fresh
  const cached = getCachedPlaylists();
  if (cached) {
    return cached;
  }

  let res;
  try {
    res = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (networkErr) {
    // Network/CORS failure — NOT a session issue
    const err = new Error("Network error — check your connection");
    err.status = 0;
    throw err;
  }

  if (!res.ok) {
    const err = new Error("Failed to fetch playlists");
    err.status = res.status; // 401, 403, 500 etc.
    throw err;
  }

  const data = await res.json();

  // ✅ Cache the fresh result
  setCachedPlaylists(data);

  return data;
};

export const createPlaylist = async (name, importUrl = "") => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate before mutating

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, importUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create playlist");
  }
  return res.json();
};

export const addSongFromYouTube = async (playlistId, song) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — playlist songs changed

  const res = await fetch(`${API_URL}/${playlistId}/songs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(song),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Add song failed");
  }

  return res.json();
};

export const deleteSong = async (playlistId, songId) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — song removed

  const res = await fetch(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to delete song");
  return res.json();
};

export const updateSong = async (playlistId, songId, data) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — song metadata changed

  const res = await fetch(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return res.json();
};

export const updatePlaylist = async (id, name) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — playlist name changed

  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  return res.json();
};

export const deletePlaylist = async (id) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — playlist removed

  await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const markPlaylistPlayed = async (id) => {
  const token = localStorage.getItem("token");

  // No cache invalidation needed here — play order is cosmetic
  // and will refresh on next natural expiry

  const res = await fetch(`${API_URL}/${id}/play`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.json();
};
