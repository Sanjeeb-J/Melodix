import { useEffect, useState } from "react";
import TrackRow from "../components/search/TrackRow";
import { usePlayer } from "../context/PlayerContext";
import { getLikedSongs, unlikeSong } from "../services/likedService";

export default function LikedSongs() {
  const player = usePlayer();
  const [songs, setSongs] = useState([]);

  const refresh = () => getLikedSongs().then(setSongs).catch(() => setSongs([]));

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="page-stack">
      <section className="liked-hero"><span>Liked Songs</span><h1>{songs.length} songs</h1></section>
      <button className="primary-play" onClick={() => songs[0] && player.playSong(songs[0], songs, 0)}>Play</button>
      <div className="track-list">
        {songs.map((song, index) => (
          <TrackRow key={song.videoId || index} song={song} index={index} liked onPlay={() => player.playSong(song, songs, index)} onLike={() => unlikeSong(song.videoId).then(refresh)} />
        ))}
      </div>
    </div>
  );
}
