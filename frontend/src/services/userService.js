import { apiRequest } from "./api";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export const getProfile = () => apiRequest("/api/user/profile", { headers: authHeaders() });

export const updateProfile = (payload) =>
  apiRequest("/api/user/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
