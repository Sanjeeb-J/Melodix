import { apiRequest } from "./api";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export const logPlay = (song) =>
  apiRequest("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(song),
  });

export const getHistory = (limit = 50) =>
  apiRequest(`/api/history?limit=${limit}`, { headers: authHeaders() });

export const getHistoryStats = () => apiRequest("/api/history/stats", { headers: authHeaders() });
