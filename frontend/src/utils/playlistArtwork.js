export const getPlaylistCover = (playlist) =>
  playlist?.coverUrl ||
  playlist?.thumbnail ||
  playlist?.songs?.find((song) => song?.thumbnail)?.thumbnail ||
  "";

export const getPlaylistSubtitle = (playlist) => {
  const count = playlist?.songs?.length || 0;
  if (playlist?.description) return playlist.description;
  return `${count} ${count === 1 ? "song" : "songs"}`;
};
