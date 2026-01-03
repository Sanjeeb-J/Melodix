// Generate consistent gradient colors based on playlist ID
export const getPlaylistCover = (playlistId) => {
  if (!playlistId) return "from-indigo-600 to-purple-600";

  const colors = [
    "from-indigo-600 to-purple-600",
    "from-pink-600 to-rose-600",
    "from-cyan-600 to-blue-600",
    "from-emerald-600 to-teal-600",
    "from-orange-600 to-red-600",
    "from-violet-600 to-fuchsia-600",
    "from-amber-600 to-yellow-600",
    "from-lime-600 to-green-600",
    "from-blue-600 to-indigo-600",
    "from-rose-600 to-pink-600",
  ];

  // Use playlist ID to generate consistent index
  const hash = playlistId.split("").reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return colors[hash % colors.length];
};

// Alternative: Use Unsplash random images
export const getPlaylistImage = (playlistId, index = 0) => {
  const topics = [
    "abstract",
    "music",
    "gradient",
    "colors",
    "neon",
    "waves",
    "geometric",
    "minimal",
  ];

  const topic = topics[index % topics.length];

  // Using Unsplash Source for random images
  return `https://source.unsplash.com/400x400/?${topic},dark`;
};

export const getPlaylistThumbnail = (playlist) => {
  if (playlist?.songs?.length > 0 && playlist.songs[0].thumbnail) {
    return playlist.songs[0].thumbnail;
  }
  return null;
};
