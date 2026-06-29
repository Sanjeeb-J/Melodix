import { apiRequest } from "./api";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export const getRecommendations = () =>
  apiRequest("/api/recommendations", { headers: authHeaders() });

export const getSimilarSongs = (videoId) =>
  apiRequest(`/api/recommendations/similar/${videoId}`, { headers: authHeaders() });
