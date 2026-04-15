import { apiRequest } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = '/api/youtube';

const authorizedFetch = async (url) => {
  const token = await AsyncStorage.getItem('melodix_token');
  return apiRequest(url, { headers: { Authorization: `Bearer ${token}` } });
};

export const searchYouTube = async (query) =>
  authorizedFetch(`${API_URL}/search?query=${encodeURIComponent(query)}`);

export const searchYouTubeMusic = async (query, type) =>
  authorizedFetch(`${API_URL}/search/music?query=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);

export const getYouTubePlaylistTracks = async (playlistId) => {
  const data = await authorizedFetch(`${API_URL}/playlist/${encodeURIComponent(playlistId)}`);
  return data.tracks || [];
};

export const getYouTubeAlbumTracks = async (browseId) =>
  authorizedFetch(`${API_URL}/album/${encodeURIComponent(browseId)}`);

export const getYouTubeArtistTracks = async (browseId) =>
  authorizedFetch(`${API_URL}/artist/${encodeURIComponent(browseId)}`);
