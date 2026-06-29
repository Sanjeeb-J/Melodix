import { X } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import TrackRow from "../search/TrackRow";

export default function QueueSidebar({ open, onClose }) {
  const player = usePlayer();

  return (
    <aside className={`queue-sidebar ${open ? "open" : ""}`}>
      <div className="drawer-heading">
        <h2>Queue</h2>
        <button className="icon-button" onClick={onClose}><X size={20} /></button>
      </div>
      {(player.queue || []).map((song, index) => (
        <TrackRow key={`${song.videoId || song.youtubeId || index}`} song={song} index={index} onPlay={() => player.playQueueItem(index)} />
      ))}
    </aside>
  );
}
