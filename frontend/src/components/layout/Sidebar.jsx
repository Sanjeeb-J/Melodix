import { Heart, Home, Library, LogOut, Plus, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getPlaylists } from "../../services/playlistService";

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    getPlaylists().then(setPlaylists).catch(() => setPlaylists([]));
  }, []);

  return (
    <aside className="spotify-sidebar">
      <div className="brand-mark"><span />Melodix</div>
      <nav className="primary-nav">
        <NavLink to="/"><Home size={21} /> Home</NavLink>
        <NavLink to="/search"><Search size={21} /> Search</NavLink>
        <NavLink to="/library"><Library size={21} /> Your Library</NavLink>
      </nav>
      <div className="library-block">
        <div className="library-title">
          <span>Your Library</span>
          <button className="icon-button" aria-label="Create playlist"><Plus size={18} /></button>
        </div>
        <NavLink className="playlist-link liked-link" to="/liked"><Heart size={18} fill="currentColor" /> Liked Songs</NavLink>
        <div className="sidebar-playlists">
          {playlists.map((playlist) => (
            <NavLink key={playlist._id} className="playlist-link" to={`/playlist/${playlist._id}`}>
              {playlist.name}
            </NavLink>
          ))}
        </div>
      </div>
      <button className="sidebar-user" onClick={logout}>
        <span>S</span>
        <strong>Sanju</strong>
        <LogOut size={17} />
      </button>
    </aside>
  );
}
