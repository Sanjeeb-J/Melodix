import { usePlayer } from "../context/PlayerContext";

export function useQueue() {
  const player = usePlayer();
  return {
    queue: player.queue || [],
    upcomingQueue: player.upcomingQueue || [],
    playQueueItem: player.playQueueItem,
  };
}
