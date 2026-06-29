import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TrackRow from "../components/search/TrackRow";
import { usePlayer } from "../context/PlayerContext";
import { useLiked } from "../hooks/useLiked";
import { apiRequest } from "../services/api";

export default function Artist() {
  const { channelId } = useParams();
  const player = usePlayer();
  const { likedSongs, toggleLike } = useLiked();
  const [artist, setArtist] = useState(null);

  useEffect(() => {
    apiRequest(`/api/youtube/artist/${channelId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then(setArtist)
      .catch(() => setArtist(null));
  }, [channelId]);

  const songs = artist?.popularSongs || artist?.tracks || [];
  const isLiked = (song) => likedSongs.some((item) => item.videoId === (song.videoId || song.youtubeId));

  return (
    <div className="page-stack">
      <section className="artist-hero" style={{ backgroundImage: artist?.thumbnail ? `linear-gradient(0deg,#121212,rgba(0,0,0,.2)),url(${artist.thumbnail})` : undefined }}>
        <h1>{artist?.name || "Artist"}</h1>
        <p>{artist?.description || artist?.subscribers || ""}</p>
      </section>
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
