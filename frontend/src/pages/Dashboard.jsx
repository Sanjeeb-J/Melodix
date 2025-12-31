import { useEffect, useState } from "react";
import { getPlaylists, createPlaylist } from "../services/playlistService";
import { useNavigate } from "react-router-dom";
import { searchYouTube } from "../services/youtubeService";
import { addSongFromYouTube } from "../services/playlistService";
import { deleteSong } from "../services/playlistService";
import { updateSong } from "../services/playlistService";

function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [newPlaylist, setNewPlaylist] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  const [editingSong, setEditingSong] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    artist: "",
    youtubeLink: "",
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!selectedPlaylist) {
      alert("Select a playlist first");
      return;
    }

    try {
      setSearchLoading(true);
      const data = await searchYouTube(searchQuery);
      setSearchResults(data);
    } catch {
      alert("Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSong = async (song) => {
    try {
      const thumbnail =
        song.thumbnails?.medium?.url ||
        song.thumbnails?.high?.url ||
        song.thumbnails?.default?.url ||
        "https://i.ytimg.com/vi/" + song.videoId + "/hqdefault.jpg";

      const payload = {
        name: song.title,
        artist: song.channelTitle,
        album: "YouTube",
        duration: "--:--",
        youtubeId: song.videoId,
        youtubeLink: `https://www.youtube.com/watch?v=${song.videoId}`,
        thumbnail: thumbnail, // 👈 GUARANTEED
      };

      const res = await addSongFromYouTube(selectedPlaylist._id, payload);

      setPlaylists((prev) =>
        prev.map((p) => (p._id === selectedPlaylist._id ? res.playlist : p))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to add song");
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.trim()) {
      alert("Playlist name cannot be empty");
      return;
    }

    try {
      const res = await createPlaylist(newPlaylist);
      setPlaylists((prev) => [res.playlist, ...prev]);
      setNewPlaylist("");
    } catch (err) {
      alert("Failed to create playlist");
    }
  };

  const handleDeleteSong = async (playlistId, songId) => {
    if (!window.confirm("Delete this song?")) return;

    try {
      const res = await deleteSong(playlistId, songId);

      setPlaylists((prev) =>
        prev.map((p) => {
          if (p._id !== playlistId) return p;
          return {
            ...p,
            songs: p.songs.filter((s) => s._id !== songId),
          };
        })
      );
    } catch (err) {
      alert("Failed to delete song");
      console.error(err);
    }
  };

  const startEditSong = (song) => {
    setEditingSong(song._id);
    setEditData({
      name: song.name,
      artist: song.artist,
      youtubeLink: song.youtubeLink,
    });
  };

  const handleUpdateSong = async (playlistId, songId) => {
    try {
      const res = await updateSong(playlistId, songId, editData);

      setPlaylists((prev) =>
        prev.map((p) => (p._id === playlistId ? res.playlist : p))
      );

      setEditingSong(null);
    } catch {
      alert("Failed to update song");
    }
  };

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const data = await getPlaylists();
        setPlaylists(data);
      } catch (error) {
        alert("Session expired. Please login again.");
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  if (loading) return <p>Loading playlists...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>

      <div style={{ marginTop: "10px" }}>
        <input
          placeholder="New playlist name"
          value={newPlaylist}
          onChange={(e) => setNewPlaylist(e.target.value)}
        />
        <button onClick={handleCreatePlaylist}>Create Playlist</button>
      </div>

      {selectedPlaylist && (
        <p>
          Selected Playlist: <strong>{selectedPlaylist.name}</strong>
        </p>
      )}

      {selectedPlaylist && (
        <div style={{ marginTop: "20px" }}>
          <input
            placeholder="Search song on YouTube"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>

          {searchLoading && <p>Searching...</p>}

          <ul>
            {searchResults.map((song) => (
              <li key={song.videoId}>
                {song.title}
                <button
                  style={{ marginLeft: "10px" }}
                  onClick={() => handleAddSong(song)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>Your Playlists</h3>

      {playlists.length === 0 && <p>No playlists yet</p>}

      {playlists.map((playlist) => (
        <div key={playlist._id} style={{ marginBottom: "20px" }}>
          <h4
            onClick={() => setSelectedPlaylist(playlist)}
            style={{
              cursor: "pointer",
              color: selectedPlaylist?._id === playlist._id ? "green" : "black",
            }}
          >
            {playlist.name}
          </h4>

          <button onClick={() => updatePlaylist(playlist._id, "New Name")}>
            Edit
          </button>
          <button onClick={() => deletePlaylist(playlist._id)}>Delete</button>

          {playlist.songs.length === 0 ? (
            <p>No songs in this playlist</p>
          ) : (
            <ul>
              {playlist.songs.map((song) => (
                <li
                  key={song._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <img
                    src={song.thumbnail}
                    alt={song.name}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "6px",
                    }}
                  />

                  <div style={{ flexGrow: 1 }}>
                    <a
                      href={song.youtubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: "bold", color: "#4ea1ff" }}
                    >
                      {song.name}
                    </a>
                    <div>{song.artist}</div>
                  </div>

                  <div>
                    {song.album} | {song.duration}
                  </div>

                  <button onClick={() => startEditSong(song)}>Edit</button>
                  <button
                    onClick={() => handleDeleteSong(playlist._id, song._id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
