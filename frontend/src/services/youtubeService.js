import { apiRequest } from "./api";

const API_URL = "/api/youtube";

const authorizedFetch = async (url) => {
  const token = localStorage.getItem("token");
  return apiRequest(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const searchYouTube = async (query) => {
  return authorizedFetch(
    `${API_URL}/search?query=${encodeURIComponent(query)}`
  );
};

export const searchYouTubeMusic = async (query, type) => {
  return authorizedFetch(
    `${API_URL}/search/music?query=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`
  );
};

export const getYouTubePlaylistTracks = async (playlistId) => {
  const data = await authorizedFetch(`${API_URL}/playlist/${encodeURIComponent(playlistId)}`);
  return data.tracks || [];
};

export const getYouTubeAlbumTracks = async (browseId) => {
  return authorizedFetch(`${API_URL}/album/${encodeURIComponent(browseId)}`);
};

export const getYouTubeArtistTracks = async (browseId) => {
  return authorizedFetch(`${API_URL}/artist/${encodeURIComponent(browseId)}`);
};
