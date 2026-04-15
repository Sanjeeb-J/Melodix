import { apiRequest, getApiUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = '/api/playlists';
const CACHE_KEY = 'melodix_playlists_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

const getCachedPlaylists = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
};

const setCachedPlaylists = async (data) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
};

const invalidatePlaylistCache = async () => AsyncStorage.removeItem(CACHE_KEY);

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('melodix_token');
  return { Authorization: `Bearer ${token}` };
};

export const getPlaylists = async () => {
  const cached = await getCachedPlaylists();
  if (cached) return cached;

  const headers = await getAuthHeaders();
  const res = await fetch(getApiUrl(API_URL), { headers });
  if (!res.ok) {
    const error = new Error('Failed to fetch playlists');
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  await setCachedPlaylists(data);
  return data;
};

export const createPlaylist = async (name, importUrl = '') => {
  await invalidatePlaylistCache();
  const headers = await getAuthHeaders();
  return apiRequest(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ name, importUrl }),
  });
};

export const addSongFromYouTube = async (playlistId, song) => {
  await invalidatePlaylistCache();
  const headers = await getAuthHeaders();
  return apiRequest(`${API_URL}/${playlistId}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(song),
  });
};

export const deleteSong = async (playlistId, songId) => {
  await invalidatePlaylistCache();
  const headers = await getAuthHeaders();
  return apiRequest(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: 'DELETE',
    headers,
  });
};

export const updateSong = async (playlistId, songId, data) => {
  await invalidatePlaylistCache();
  const headers = await getAuthHeaders();
  return apiRequest(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
};

export const updatePlaylist = async (id, name) => {
  await invalidatePlaylistCache();
  const headers = await getAuthHeaders();
  return apiRequest(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ name }),
  });
};

export const deletePlaylist = async (id) => {
  await invalidatePlaylistCache();
  const headers = await getAuthHeaders();
  await apiRequest(`${API_URL}/${id}`, { method: 'DELETE', headers });
};

export const markPlaylistPlayed = async (id) => {
  const headers = await getAuthHeaders();
  return apiRequest(`${API_URL}/${id}/play`, { method: 'PUT', headers });
};
