const API_URL = `${import.meta.env.VITE_API_URL}/api/youtube/search`;

export const searchYouTube = async (query) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}?query=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    // Attach the HTTP status so callers can handle 429 (rate limit) separately
    const err = new Error(`YouTube search failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return res.json();
};
