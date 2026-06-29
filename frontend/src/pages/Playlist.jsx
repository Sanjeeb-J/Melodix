import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CoverArt from "../components/shared/CoverArt";
import TrackRow from "../components/search/TrackRow";
import { usePlayer } from "../context/PlayerContext";
import { useLiked } from "../hooks/useLiked";
import { apiRequest } from "../services/api";
import { getPlaylists } from "../services/playlistService";
import { getPlaylistCover, getPlaylistSubtitle } from "../utils/playlistArtwork";

export default function Playlist() {
  const { id } = useParams();
  const player = usePlayer();
  const { likedSongs, toggleLike } = useLiked();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPlaylist(null);

    apiRequest(`/api/playlists/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((data) => {
        if (!cancelled) setPlaylist(data);
      })
      .catch(async (err) => {
        try {
          const playlists = await getPlaylists({ forceRefresh: true });
          const fallback = playlists.find((item) => item._id === id);
          if (!cancelled && fallback) {
            setPlaylist(fallback);
            return;
          }
        } catch {
          // Keep the original API error below.
        }
        if (!cancelled) setError(err.message || "Could not load playlist");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="page-stack"><h1 className="page-title">Loading playlist...</h1></div>;
  if (!playlist) {
    return (
      <div className="page-stack">
        <h1 className="page-title">Playlist not found</h1>
        {error && <p className="muted">{error}</p>}
      </div>
    );
  }

  const songs = playlist.songs || [];
  const isLiked = (song) => likedSongs.some((item) => item.videoId === (song.videoId || song.youtubeId));

  return (
    <div className="page-stack">
      <section className="entity-header">
        <CoverArt src={getPlaylistCover(playlist)} title={playlist.name} color={playlist.coverColor} className="entity-cover" />
        <div><span>Playlist</span><h1>{playlist.name}</h1><p>{getPlaylistSubtitle(playlist)}</p></div>
      </section>
      <button className="primary-play" onClick={() => songs[0] && player.playSong(songs[0], songs, 0)}>Play</button>
      <div className="track-list">
        {songs.map((song, index) => (
          <TrackRow
            key={song._id || song.videoId || index}
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
