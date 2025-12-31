const API_URL = "https://melodix-backend.onrender.com/api/youtube/search";

export const searchYouTube = async (query) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}?query=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("YouTube search failed");
  }

  return res.json();
};
