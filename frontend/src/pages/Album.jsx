import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CoverArt from "../components/shared/CoverArt";
import TrackRow from "../components/search/TrackRow";
import { usePlayer } from "../context/PlayerContext";
import { useLiked } from "../hooks/useLiked";
import { apiRequest } from "../services/api";

export default function Album() {
  const { playlistId } = useParams();
  const player = usePlayer();
  const { likedSongs, toggleLike } = useLiked();
  const [album, setAlbum] = useState(null);

  useEffect(() => {
    apiRequest(`/api/youtube/album/${playlistId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    }).then(setAlbum).catch(() => setAlbum(null));
  }, [playlistId]);

  const songs = album?.songs || album?.tracks || [];
  const isLiked = (song) => likedSongs.some((item) => item.videoId === (song.videoId || song.youtubeId));

  return (
    <div className="page-stack">
      <section className="entity-header">
        <CoverArt src={album?.thumbnail} title={album?.title || "Album"} className="entity-cover" />
        <div>
          <span>Album</span>
          <h1>{album?.title || "Album"}</h1>
          <p>{album?.artist || "YouTube Music"} {album?.year ? `- ${album.year}` : ""}</p>
        </div>
      </section>
      <button className="primary-play" onClick={() => songs[0] && player.playSong(songs[0], songs, 0)}>Play</button>
      <div className="track-list">
        {songs.map((song, index) => (
          <TrackRow
            key={song.videoId || index}
            song={song}
            index={index}
            liked={isLiked(song)}
            onPlay={() => player.playSong(song, songs, index)}
            onLike={() => toggleLike(song)}
          />
        ))}
      </div>
    </div>
  );
}
