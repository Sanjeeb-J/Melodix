import { apiRequest } from "./api";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export const logSearch = (query) =>
  apiRequest("/api/search/log", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ query }),
  });

export const getRecentSearches = () => apiRequest("/api/search/recent", { headers: authHeaders() });

export const clearRecentSearches = () =>
  apiRequest("/api/search/recent", { method: "DELETE", headers: authHeaders() });
