import { useEffect, useState } from "react";
import {
  getPlaylists,
  createPlaylist,
  addSongFromYouTube,
  deleteSong,
  updateSong,
  updatePlaylist,
  deletePlaylist,
} from "../services/playlistService";
import { useNavigate } from "react-router-dom";
import { searchYouTube } from "../services/youtubeService";
import { useToast } from "../components/ToastContainer";
import EditModal from "../components/EditModal";
import UserProfileModal from "../components/UserProfileModal";
import { getPlaylistCover } from "../utils/playlistCover";
import { Edit2, Clock, User } from "lucide-react";
import { getUserProfile, updateUserProfile } from "../services/authService";

function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState("");
  const [editingSong, setEditingSong] = useState(null);
  const [editingSongData, setEditingSongData] = useState({
    name: "",
    artist: "",
    duration: "",
  });
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] =
    useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsProfileModalOpen(false);
    navigate("/");
  };

  const handleUpdateProfile = async (profileData) => {
    if (!profileData.currentPassword) {
      showToast("Current password is required", "error");
      return;
    }

    try {
      const updateData = {
        name: profileData.name,
        currentPassword: profileData.currentPassword,
      };

      if (profileData.newPassword) {
        updateData.newPassword = profileData.newPassword;
      }

      const updatedUser = await updateUserProfile(updateData);
      setUserProfile(updatedUser.user);
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!selectedPlaylist) {
      showToast("Please select a playlist first", "error");
      return;
    }

    try {
      setSearchLoading(true);
      const data = await searchYouTube(searchQuery);
      setSearchResults(data);
      if (data.length === 0) {
        showToast("No results found", "info");
      }
    } catch {
      showToast("Search failed. Please try again.", "error");
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
        `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;

      const payload = {
        name: song.title,
        artist: song.channelTitle,
        album: "YouTube",
        duration: song.duration || "0:00",
        youtubeId: song.videoId,
        youtubeLink: `https://www.youtube.com/watch?v=${song.videoId}`,
        thumbnail: thumbnail,
      };

      const res = await addSongFromYouTube(selectedPlaylist._id, payload);
      setPlaylists((prev) =>
        prev.map((p) => (p._id === selectedPlaylist._id ? res.playlist : p))
      );
      setSelectedPlaylist(res.playlist);
      setSearchResults([]);
      setSearchQuery("");
      setIsSearchOpen(false);
      showToast("Song added successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to add song", "error");
    }
  };

  const openCreatePlaylistModal = () => {
    setNewPlaylist("");
    setIsCreatePlaylistModalOpen(true);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.trim()) {
      showToast("Playlist name cannot be empty", "error");
      return;
    }

    try {
      const res = await createPlaylist(newPlaylist);
      setPlaylists((prev) => [res.playlist, ...prev]);
      setNewPlaylist("");
      setSelectedPlaylist(res.playlist);
      setCurrentView("playlist");
      setIsCreatePlaylistModalOpen(false);
      showToast("Playlist created!", "success");
    } catch (err) {
      showToast("Failed to create playlist", "error");
    }
  };

  const handleDeleteSong = async (playlistId, songId) => {
    try {
      await deleteSong(playlistId, songId);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p._id !== playlistId) return p;
          const updatedPlaylist = {
            ...p,
            songs: p.songs.filter((s) => s._id !== songId),
          };
          if (selectedPlaylist?._id === playlistId) {
            setSelectedPlaylist(updatedPlaylist);
          }
          return updatedPlaylist;
        })
      );
      showToast("Song removed", "success");
    } catch (err) {
      showToast("Failed to delete song", "error");
    }
  };

  const handlePlaylistSelect = (playlist) => {
    setSelectedPlaylist(playlist);
    setCurrentView("playlist");
    setIsMobileMenuOpen(false);
  };

  const handleEditPlaylist = (playlist) => {
    setEditingPlaylist(playlist);
    setEditingPlaylistName(playlist.name);
  };

  const savePlaylistEdit = async () => {
    if (!editingPlaylistName.trim()) {
      showToast("Playlist name cannot be empty", "error");
      return;
    }

    try {
      await updatePlaylist(editingPlaylist._id, editingPlaylistName);
      setPlaylists((prev) =>
        prev.map((p) =>
          p._id === editingPlaylist._id ? { ...p, name: editingPlaylistName } : p
        )
      );
      if (selectedPlaylist?._id === editingPlaylist._id) {
        setSelectedPlaylist((prev) => ({ ...prev, name: editingPlaylistName }));
      }
      setEditingPlaylist(null);
      showToast("Playlist updated!", "success");
    } catch (err) {
      showToast("Failed to update playlist", "error");
    }
  };

  const deletePlaylistHandler = async (id) => {
    try {
      await deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p._id !== id));
      if (selectedPlaylist?._id === id) {
        setCurrentView("home");
        setSelectedPlaylist(null);
      }
      showToast("Playlist deleted", "success");
    } catch (err) {
      showToast("Failed to delete playlist", "error");
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setEditingSongData({
      name: song.name,
      artist: song.artist,
      duration: song.duration,
    });
  };

  const saveSongEdit = async () => {
    if (!editingSongData.name.trim()) {
      showToast("Song name cannot be empty", "error");
      return;
    }

    try {
      await updateSong(
        selectedPlaylist._id,
        editingSong._id,
        editingSongData
      );
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p._id !== selectedPlaylist._id) return p;
          return {
            ...p,
            songs: p.songs.map((s) =>
              s._id === editingSong._id ? { ...s, ...editingSongData } : s
            ),
          };
        })
      );
      setSelectedPlaylist((prev) => ({
        ...prev,
        songs: prev.songs.map((s) =>
          s._id === editingSong._id ? { ...s, ...editingSongData } : s
        ),
      }));
      setEditingSong(null);
      showToast("Song updated!", "success");
    } catch (err) {
      showToast("Failed to update song", "error");
    }
  };

  const playSong = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playlistsData, profileData] = await Promise.all([
          getPlaylists(),
          getUserProfile(),
        ]);
        setPlaylists(playlistsData);
        setUserProfile(profileData.user);
      } catch (error) {
        showToast("Session expired. Please login again.", "error");
        setTimeout(handleLogout, 2000);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white selection:bg-indigo-500/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-indigo-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-purple-900/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="h-full w-3/4 max-w-sm bg-black border-r border-zinc-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sidebar Content */}
              <div className="flex items-center space-x-2 text-indigo-500 font-bold text-2xl mb-8">
                <div className="bg-indigo-600/10 p-1.5 rounded-lg">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <span>Melodix</span>
              </div>

              <nav className="space-y-1 mb-8">
                <button
                  onClick={() => {
                    setCurrentView("home");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-4 w-full px-4 py-3 rounded-xl transition-all ${
                    currentView === "home"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span className="font-semibold text-sm">Home</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView("library");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-4 w-full px-4 py-3 rounded-xl transition-all ${
                    currentView === "library"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M3 12h18" />
                    <path d="M3 18h18" />
                  </svg>
                  <span className="font-semibold text-sm">Library</span>
                </button>
              </nav>

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-zinc-500 uppercase">
                  Playlists
                </span>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openCreatePlaylistModal();
                  }}
                  className="text-zinc-500 hover:text-white p-1 bg-zinc-900 rounded-md"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                </button>
              </div>

              <div className="space-y-1">
                {playlists.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => handlePlaylistSelect(p)}
                    className="w-full text-left px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm truncate"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="mt-8 w-full bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <User size={18} />
                {userProfile?.name || "Profile"}
              </button>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 bg-black h-full flex-col p-6 space-y-8 border-r border-zinc-900">
          <div className="flex items-center space-x-2 text-indigo-500 font-bold text-2xl">
            <div className="bg-indigo-600/10 p-1.5 rounded-lg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <span>Melodix</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setCurrentView("home")}
              className={`flex items-center space-x-4 w-full px-4 py-3 rounded-xl transition-all ${
                currentView === "home"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="font-semibold text-sm">Home</span>
            </button>
            <button
              onClick={() => setCurrentView("library")}
              className={`flex items-center space-x-4 w-full px-4 py-3 rounded-xl transition-all ${
                currentView === "library"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
              <span className="font-semibold text-sm">Library</span>
            </button>
          </nav>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-500 uppercase">
                Playlists
              </span>
              <button
                onClick={openCreatePlaylistModal}
                className="text-zinc-500 hover:text-white p-1 bg-zinc-900 rounded-md"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {playlists.map((p) => (
                <div key={p._id} className="group flex items-center">
                  <button
                    onClick={() => handlePlaylistSelect(p)}
                    className="flex-1 text-left px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm truncate"
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => deletePlaylistHandler(p._id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <User size={18} />
            {userProfile?.name || "Profile"}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-black p-4 md:p-8">
          {/* Mobile Header */}
          <header className="flex md:hidden items-center justify-between mb-6 sticky top-0 bg-black/50 backdrop-blur-md -mx-4 px-4 py-3 z-40 border-b border-white/5">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-zinc-400"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center space-x-2 text-indigo-500 font-black text-xl">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>Melodix</span>
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-zinc-400"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </header>

          {/* Home View */}
          {currentView === "home" && (
            <div className="space-y-12">
              <section className="bg-gradient-to-br from-indigo-600/20 via-purple-600/5 to-transparent p-8 md:p-16 rounded-3xl border border-white/5">
                <h2 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter">
                  Rediscover Your
                  <br />
                  <span className="text-zinc-500">Music Taste.</span>
                </h2>
                <p className="text-zinc-400 text-lg mb-10 max-w-2xl">
                  Your personalized music library with YouTube integration.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={openCreatePlaylistModal}
                    className="bg-white text-black font-black px-10 py-4 rounded-full hover:scale-105 transition-all"
                  >
                    Create New Mix
                  </button>
                  <button
                    onClick={() => setCurrentView("library")}
                    className="bg-white/5 text-white font-black px-10 py-4 rounded-full border border-white/10 hover:bg-white/10 transition-all"
                  >
                    Explore Library
                  </button>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl md:text-4xl font-black">
                    Recent Mixes
                  </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {playlists.slice(0, 10).map((p, index) => (
                    <div
                      key={p._id}
                      onClick={() => handlePlaylistSelect(p)}
                      className="group bg-zinc-900/30 p-4 rounded-3xl hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <div
                        className={`aspect-square rounded-2xl overflow-hidden mb-4 bg-gradient-to-br ${getPlaylistCover(
                          p._id
                        )}`}
                      ></div>
                      <h4 className="font-black truncate text-lg">{p.name}</h4>
                      <p className="text-xs text-zinc-500 font-bold uppercase">
                        {p.songs?.length || 0} Tracks
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Library View */}
          {currentView === "library" && (
            <div className="space-y-12">
              <div className="flex justify-between items-end border-b border-white/5 pb-10">
                <div>
                  <h2 className="text-5xl md:text-7xl font-black">Library</h2>
                  <p className="text-zinc-500 mt-4 text-lg">
                    Your curated universe.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {playlists.map((p, index) => (
                  <div
                    key={p._id}
                    onClick={() => handlePlaylistSelect(p)}
                    className="bg-zinc-900/30 p-4 rounded-3xl hover:bg-zinc-800 transition-all cursor-pointer group"
                  >
                    <div
                      className={`aspect-square rounded-2xl overflow-hidden mb-4 bg-gradient-to-br ${getPlaylistCover(
                        p._id
                      )}`}
                    ></div>
                    <h4 className="font-black truncate mb-2">{p.name}</h4>
                    <span className="text-xs text-zinc-600 font-black uppercase">
                      {p.songs?.length || 0} items
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playlist View */}
          {currentView === "playlist" && selectedPlaylist && (
            <div className="space-y-16 pb-32">
              <div className="flex flex-col md:flex-row items-center md:items-end space-y-8 md:space-y-0 md:space-x-12">
                <div
                  className={`w-48 h-48 md:w-80 md:h-80 rounded-3xl bg-gradient-to-br ${getPlaylistCover(
                    selectedPlaylist._id
                  )} shadow-2xl`}
                ></div>
                <div className="flex-1 text-center md:text-left">
                  <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-lg">
                    Private Mix
                  </span>
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-6 mb-4">
                    <h1 className="text-4xl md:text-8xl font-black">
                      {selectedPlaylist.name}
                    </h1>
                    <button
                      onClick={() => handleEditPlaylist(selectedPlaylist)}
                      className="p-3 hover:bg-white/10 rounded-xl transition-all"
                    >
                      <Edit2 size={28} className="text-zinc-400 hover:text-white" />
                    </button>
                  </div>
                  <p className="text-zinc-400 text-lg mb-10">
                    {selectedPlaylist.songs?.length || 0} tracks
                  </p>
                  <div className="flex items-center justify-center md:justify-start space-x-6">
                    <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-all text-black">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="ml-1"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 px-10 py-5 rounded-3xl font-black flex items-center space-x-4 transition-all"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                      <span>Add Songs</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/20 rounded-3xl overflow-hidden border border-white/5">
                {!selectedPlaylist.songs ||
                selectedPlaylist.songs.length === 0 ? (
                  <div className="py-40 text-center">
                    <p className="text-4xl font-black mb-4">Silent Mix</p>
                    <p className="text-zinc-500 mb-10">
                      Add some tracks to bring this collection to life.
                    </p>
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="bg-white text-black font-black px-14 py-5 rounded-full"
                    >
                      Find Music
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {/* Table Header */}
                    <div className="flex items-center p-5 text-zinc-500 text-xs font-bold uppercase border-b border-white/10">
                      <span className="w-12">#</span>
                      <span className="flex-1">Title</span>
                      <span className="w-32 hidden lg:block">Artist</span>
                      <span className="w-24 hidden md:flex items-center gap-2">
                        <Clock size={14} />
                        Duration
                      </span>
                      <span className="w-32 text-right">Actions</span>
                    </div>
                    
                    {selectedPlaylist.songs.map((song, index) => (
                      <div
                        key={song._id}
                        onClick={() => playSong(song)}
                        className="flex items-center p-5 hover:bg-white/5 transition-all cursor-pointer group"
                      >
                        <span className="w-12 text-zinc-600 font-mono text-sm">
                          {index + 1}
                        </span>
                        <div className="flex items-center space-x-5 flex-1 min-w-0">
                          <img
                            src={song.thumbnail}
                            className="w-14 h-14 rounded-xl shadow-lg object-cover"
                            alt={song.name}
                          />
                          <div className="min-w-0 flex-1">
                            <a
                              href={song.youtubeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-base truncate block group-hover:text-indigo-400"
                            >
                              {song.name}
                            </a>
                            <span className="text-xs text-zinc-500 font-semibold truncate block lg:hidden">
                              {song.artist}
                            </span>
                          </div>
                        </div>
                        <span className="w-32 text-sm text-zinc-400 truncate hidden lg:block">
                          {song.artist}
                        </span>
                        <span className="w-24 text-zinc-500 text-sm font-mono hidden md:block">
                          {song.duration}
                        </span>
                        <div className="w-32 flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSong(song);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-indigo-400 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSong(selectedPlaylist._id, song._id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-zinc-950 w-full max-w-4xl max-h-[85vh] rounded-3xl border border-white/5 overflow-hidden flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center space-x-4">
              <svg
                className="text-zinc-500"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search YouTube..."
                className="bg-transparent border-none outline-none text-white w-full text-3xl font-black"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-zinc-500 hover:text-white p-2"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {searchLoading && (
                <div className="flex flex-col items-center py-32">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-zinc-500 mt-6 font-black">Searching...</p>
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((song) => (
                    <div
                      key={song.videoId}
                      className="flex items-center justify-between p-5 hover:bg-white/5 bg-white/[0.02] border border-white/5 rounded-3xl transition-all cursor-pointer"
                      onClick={() => handleAddSong(song)}
                    >
                      <div className="flex items-center space-x-5 min-w-0">
                        <img
                          src={
                            song.thumbnails?.medium?.url ||
                            `https://i.ytimg.com/vi/${song.videoId}/default.jpg`
                          }
                          className="w-16 h-16 rounded-2xl object-cover"
                          alt=""
                        />
                        <div className="min-w-0">
                          <h4 className="text-white font-bold text-xl truncate">
                            {song.title}
                          </h4>
                          <p className="text-xs text-zinc-500 font-black uppercase truncate">
                            {song.channelTitle}
                          </p>
                        </div>
                      </div>
                      <button className="bg-white text-black font-black px-6 py-3 rounded-full text-sm">
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Playlist Modal */}
      <EditModal
        isOpen={!!editingPlaylist}
        onClose={() => setEditingPlaylist(null)}
        onSave={savePlaylistEdit}
        title="Edit Playlist"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Playlist Name
          </label>
          <input
            type="text"
            value={editingPlaylistName}
            onChange={(e) => setEditingPlaylistName(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
            placeholder="Enter playlist name"
          />
        </div>
      </EditModal>

      {/* Edit Song Modal */}
      <EditModal
        isOpen={!!editingSong}
        onClose={() => setEditingSong(null)}
        onSave={saveSongEdit}
        title="Edit Song"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Song Name
            </label>
            <input
              type="text"
              value={editingSongData.name}
              onChange={(e) =>
                setEditingSongData({ ...editingSongData, name: e.target.value })
              }
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
              placeholder="Enter song name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Artist
            </label>
            <input
              type="text"
              value={editingSongData.artist}
              onChange={(e) =>
                setEditingSongData({
                  ...editingSongData,
                  artist: e.target.value,
                })
              }
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
              placeholder="Enter artist name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Duration
            </label>
            <input
              type="text"
              value={editingSongData.duration}
              onChange={(e) =>
                setEditingSongData({
                  ...editingSongData,
                  duration: e.target.value,
                })
              }
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
              placeholder="e.g., 3:45"
            />
          </div>
        </div>
      </EditModal>

      {/* Create Playlist Modal */}
      <EditModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        onSave={handleCreatePlaylist}
        title="Create New Playlist"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Playlist Name
          </label>
          <input
            autoFocus
            type="text"
            value={newPlaylist}
            onChange={(e) => setNewPlaylist(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreatePlaylist();
              }
            }}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
            placeholder="My Awesome Playlist"
          />
        </div>
      </EditModal>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default Dashboard;
