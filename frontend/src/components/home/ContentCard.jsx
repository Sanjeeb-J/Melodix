import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CoverArt from "../shared/CoverArt";
import { getPlaylistCover } from "../../utils/playlistArtwork";

export default function ContentCard({ item, onPlay }) {
  const navigate = useNavigate();
  const title = item?.title || item?.name || "Untitled";
  const subtitle = item?.artist || item?.author || item?.subscribers || "Melodix";
  const open = () => {
    if (item?._id) navigate(`/playlist/${item._id}`);
    else if (item?.playlistId) navigate(`/album/${item.playlistId}`);
    else if (item?.browseId && item?.type === "artist") navigate(`/artist/${item.browseId}`);
    else if (item?.browseId) navigate(`/album/${item.browseId}`);
  };

  return (
    <article className="content-card" onClick={open}>
      <div className="content-card-cover">
        <CoverArt src={item?.thumbnail || getPlaylistCover(item)} title={title} color={item?.coverColor} />
        {onPlay && (
          <button className="floating-play" onClick={(event) => { event.stopPropagation(); onPlay(item); }} aria-label={`Play ${title}`}>
            <Play size={22} fill="currentColor" />
          </button>
        )}
      </div>
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </article>
  );
}
