import { useCallback, useEffect, useState } from "react";
import { getLikedSongs, likeSong, unlikeSong } from "../services/likedService";

const getSongId = (song) => song?.videoId || song?.youtubeId;

export function useLiked() {
  const [likedSongs, setLikedSongs] = useState([]);

  const refresh = useCallback(async () => {
    setLikedSongs(await getLikedSongs());
  }, []);

  const toggleLike = useCallback(async (song) => {
    const videoId = getSongId(song);
    if (!videoId) return;

    if (likedSongs.some((item) => item.videoId === videoId)) {
      await unlikeSong(videoId);
    } else {
      await likeSong(song);
    }
    await refresh();
  }, [likedSongs, refresh]);

  useEffect(() => {
    refresh().catch(() => setLikedSongs([]));
  }, [refresh]);

  return { likedSongs, toggleLike, refresh };
}
