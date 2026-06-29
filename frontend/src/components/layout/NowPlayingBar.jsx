import { ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { useLiked } from "../../hooks/useLiked";
import CoverArt from "../shared/CoverArt";
import LikeButton from "../shared/LikeButton";

const fmt = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

export default function NowPlayingBar({ onToggleQueue }) {
  const player = usePlayer();
  const { likedSongs, toggleLike } = useLiked();
  const song = player.currentSong;
  const title = song?.title || song?.name || "Choose a song";
  const artist = song?.artist || "Melodix";
  const songId = song?.videoId || song?.youtubeId;
  const liked = likedSongs.some((item) => item.videoId === songId);

  return (
    <footer className="now-playing-bar">
      <div className="now-song">
        <CoverArt src={song?.thumbnail} title={title} className="now-cover" />
        <div><strong>{title}</strong><span>{artist}</span></div>
        {song && <LikeButton active={liked} onClick={() => toggleLike(song)} />}
      </div>
      <div className="player-center">
        <div className="player-controls">
          <button className={`icon-button ${player.isShuffle ? "active" : ""}`} onClick={player.toggleShuffle}><Shuffle size={17} /></button>
          <button className="icon-button" onClick={player.prevSong}><SkipBack size={19} fill="currentColor" /></button>
          <button className="play-button" onClick={player.togglePlay}>
            {player.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button className="icon-button" onClick={player.nextSong}><SkipForward size={19} fill="currentColor" /></button>
          <button className={`icon-button ${player.repeatMode !== "none" ? "active" : ""}`} onClick={player.toggleRepeat}><Repeat size={17} /></button>
        </div>
        <div className="progress-line">
          <span>{fmt(player.currentTime)}</span>
          <input type="range" min="0" max="1000" value={Math.round((player.progress || 0) * 1000)} onChange={(e) => player.seek(Number(e.target.value) / 1000)} />
          <span>{fmt(player.duration)}</span>
        </div>
      </div>
      <div className="player-right">
        <button className="icon-button" onClick={onToggleQueue}><ListMusic size={18} /></button>
        <Volume2 size={18} />
        <input type="range" min="0" max="100" value={Math.round((player.volume || 0) * 100)} onChange={(e) => player.setVolume(Number(e.target.value) / 100)} />
      </div>
    </footer>
  );
}
