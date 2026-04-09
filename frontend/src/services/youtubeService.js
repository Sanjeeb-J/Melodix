const API_URL = `${import.meta.env.VITE_API_URL}/api/youtube`;

const authorizedFetch = async (url) => {
  const token = localStorage.getItem("token");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return res.json();
};

export const searchYouTube = async (query) => {
  return authorizedFetch(`${API_URL}/search?query=${encodeURIComponent(query)}`);
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
