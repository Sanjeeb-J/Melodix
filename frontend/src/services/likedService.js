import { apiRequest } from "./api";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export const getLikedSongs = () => apiRequest("/api/liked", { headers: authHeaders() });

export const likeSong = (song) => {
  const videoId = song.videoId || song.youtubeId;
  return apiRequest(`/api/liked/${videoId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(song),
  });
};

export const unlikeSong = (videoId) =>
  apiRequest(`/api/liked/${videoId}`, { method: "DELETE", headers: authHeaders() });

export const getLikedStatus = (videoId) =>
  apiRequest(`/api/liked/${videoId}/status`, { headers: authHeaders() });
