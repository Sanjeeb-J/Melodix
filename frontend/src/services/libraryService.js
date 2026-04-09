const API_URL = `${import.meta.env.VITE_API_URL}/api/library`;

const authHeaders = (includeJson = false) => {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const parseResponse = async (res, fallbackMessage) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || fallbackMessage);
  }
  return data;
};

export const getLibraryHome = async () => {
  const res = await fetch(`${API_URL}/home`, {
    headers: authHeaders(),
  });

  return parseResponse(res, "Failed to load home feed");
};

export const getProfile = async () => {
  const res = await fetch(`${API_URL}/profile`, {
    headers: authHeaders(),
  });

  return parseResponse(res, "Failed to load profile");
};

export const updateProfile = async (payload) => {
  const res = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  return parseResponse(res, "Failed to update profile");
};

export const getLikedSongs = async () => {
  const res = await fetch(`${API_URL}/likes`, {
    headers: authHeaders(),
  });

  return parseResponse(res, "Failed to load liked songs");
};

export const toggleLikeSong = async (track) => {
  const res = await fetch(`${API_URL}/likes/toggle`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(track),
  });

  return parseResponse(res, "Failed to update liked songs");
};

export const getRecentPlays = async () => {
  const res = await fetch(`${API_URL}/recent`, {
    headers: authHeaders(),
  });

  return parseResponse(res, "Failed to load recent plays");
};

export const addRecentPlay = async (payload) => {
  const res = await fetch(`${API_URL}/recent`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  return parseResponse(res, "Failed to save recent play");
};
