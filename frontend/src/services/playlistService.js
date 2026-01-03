const API_URL = "https://melodix-backend.onrender.com/api/playlists";

export const getPlaylists = async () => {
  const token = localStorage.getItem("token");

  const res = await fetch(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch playlists");
  return res.json();
};

export const createPlaylist = async (name) => {
  const token = localStorage.getItem("token");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) throw new Error("Failed to create playlist");
  return res.json();
};

export const addSongFromYouTube = async (playlistId, song) => {
  const token = localStorage.getItem("token");

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

  const res = await fetch(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to delete song");
  return res.json();
};

export const updateSong = async (playlistId, songId, data) => {
  const token = localStorage.getItem("token");

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

  await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
};
