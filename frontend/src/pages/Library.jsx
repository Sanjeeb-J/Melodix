import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoverArt from "../components/shared/CoverArt";
import { getPlaylists } from "../services/playlistService";
import { getPlaylistCover } from "../utils/playlistArtwork";

export default function Library() {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    getPlaylists({ forceRefresh: true }).then(setPlaylists).catch(() => setPlaylists([]));
  }, []);

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <h1 className="page-title">Your Library</h1>
      </div>
      <div className="filter-pills"><button className="active">Playlists</button><button>Albums</button><button>Artists</button></div>
      <Link className="library-list-item" to="/liked"><CoverArt color="#8D67AB" /><div><strong>Liked Songs</strong><span>Playlist</span></div></Link>
      {playlists.map((playlist) => (
        <Link className="library-list-item" key={playlist._id} to={`/playlist/${playlist._id}`}>
          <CoverArt src={getPlaylistCover(playlist)} title={playlist.name} color={playlist.coverColor} />
          <div><strong>{playlist.name}</strong><span>Playlist - {playlist.songs?.length || 0} songs</span></div>
          <small>{Math.round((playlist.totalDuration || 0) / 60)} min</small>
        </Link>
      ))}
    </div>
  );
}
