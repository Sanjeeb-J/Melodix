// ─── Playlist Service ──────────────────────────────────────────────────────────
// Includes localStorage caching for getPlaylists (5-minute TTL).
// All mutation functions (create, add, delete, update) invalidate the cache
// so the next fetch always returns fresh data.

import { apiRequest, getApiUrl } from "./api";

const API_URL = "/api/playlists";

const CACHE_KEY_PREFIX = "melodix_playlists_cache";
const LEGACY_CACHE_KEY = "melodix_playlists_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Cache helpers ────────────────────────────────────────────────────────────

const getCacheKey = (token) => {
  if (!token) return null;
  return `${CACHE_KEY_PREFIX}:${token}`;
};

const clearLegacyPlaylistCache = () => {
  localStorage.removeItem(LEGACY_CACHE_KEY);
};

const getCachedPlaylists = (token) => {
  try {
    clearLegacyPlaylistCache();
    const cacheKey = getCacheKey(token);
    if (!cacheKey) return null;

    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCachedPlaylists = (token, data) => {
  try {
    const cacheKey = getCacheKey(token);
    if (!cacheKey) return;

    clearLegacyPlaylistCache();
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage might be full — fail silently
  }
};

const invalidatePlaylistCache = () => {
  const token = localStorage.getItem("token");
  const cacheKey = getCacheKey(token);
  if (cacheKey) {
    localStorage.removeItem(cacheKey);
  }
  clearLegacyPlaylistCache();
};

// ─── API functions ────────────────────────────────────────────────────────────

export const getPlaylists = async ({ forceRefresh = false } = {}) => {
  const token = localStorage.getItem("token");

  // ✅ Serve from cache if fresh
  if (!forceRefresh) {
    const cached = getCachedPlaylists(token);
    if (cached) {
      return cached;
    }
  }

  let res;
  try {
    res = await fetch(getApiUrl(API_URL), {
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
  setCachedPlaylists(token, data);

  return data;
};

export const createPlaylist = async (name, importUrl = "") => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate before mutating

  return apiRequest(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, importUrl }),
  });
};

export const addSongFromYouTube = async (playlistId, song) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — playlist songs changed

  return apiRequest(`${API_URL}/${playlistId}/songs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(song),
  });
};

export const deleteSong = async (playlistId, songId) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — song removed

  return apiRequest(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updateSong = async (playlistId, songId, data) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — song metadata changed

  return apiRequest(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
};

export const updatePlaylist = async (id, name) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — playlist name changed

  return apiRequest(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
};

export const deletePlaylist = async (id) => {
  const token = localStorage.getItem("token");

  invalidatePlaylistCache(); // ✅ Invalidate — playlist removed

  await apiRequest(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const markPlaylistPlayed = async (id) => {
  const token = localStorage.getItem("token");

  // No cache invalidation needed here — play order is cosmetic
  // and will refresh on next natural expiry

  return apiRequest(`${API_URL}/${id}/play`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
};
