// The backend uses JWT in the Authorization header.
// For audio streaming via <audio src>, we pass the token as a query param.
const API_URL = import.meta.env.VITE_API_URL;

export const getStreamUrl = (videoId) => {
  const token = localStorage.getItem("token");
  return `${API_URL}/api/stream/${videoId}?token=${encodeURIComponent(token)}`;
};
