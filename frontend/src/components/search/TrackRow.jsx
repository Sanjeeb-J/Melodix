import { Heart, MoreHorizontal, Play } from "lucide-react";
import CoverArt from "../shared/CoverArt";

export default function TrackRow({ song, index = 0, liked = false, onPlay, onLike }) {
  const title = song?.title || song?.name || "Untitled";
  const artist = song?.artist || song?.author || "Unknown artist";

  return (
    <div className="track-row">
      <button className="track-index" onClick={() => onPlay?.(song)} aria-label={`Play ${title}`}>
        <span>{index + 1}</span>
        <Play size={16} fill="currentColor" />
      </button>
      <CoverArt src={song?.thumbnail} title={title} className="track-cover" />
      <div className="track-main">
        <strong>{title}</strong>
        <span>{artist}</span>
      </div>
      <span className="track-album">{song?.album || "YouTube"}</span>
      <span className="track-duration">{song?.duration || "--:--"}</span>
      <button className={`icon-button ${liked ? "active" : ""}`} onClick={() => onLike?.(song)} aria-label="Like">
        <Heart size={17} fill={liked ? "currentColor" : "none"} />
      </button>
      <button className="icon-button" aria-label="More">
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}
