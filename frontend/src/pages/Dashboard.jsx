import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../components/ToastContainer";
import {
  getPlaylists,
  createPlaylist,
  addSongFromYouTube,
  deleteSong,
  updateSong,
  updatePlaylist,
  deletePlaylist,
} from "../services/playlistService";
import { searchYouTube } from "../services/youtubeService";
import { getPlaylistCover } from "../utils/playlistCover";
import {
  Home,
  Search,
  Library,
  Plus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  MoreHorizontal,
  Trash2,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Music2,
  ListMusic,
  Loader2,
  Menu,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────
const fmtTime = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ─── PlayerBar ─────────────────────────────────────────
function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    isShuffle,
    repeatMode,
    volume,
    progress,
    duration,
    currentTime,
    isLoading,
    togglePlay,
    nextSong,
    prevSong,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const progressRef = useRef(null);

  const handleProgressClick = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, frac)));
  };

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 border-t border-[rgba(255,255,255,0.06)]"
      style={{ height: "var(--player-height)", background: "#181818" }}
    >
      {/* Left: song info (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-3 w-[30%] min-w-0">
        {currentSong ? (
          <>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.name || currentSong.title}
              className="w-14 h-14 rounded object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {currentSong.name || currentSong.title}
              </p>
              <p className="text-xs text-sp-dim truncate">{currentSong.artist}</p>
            </div>
            <button className="text-sp-dim hover:text-sp-green transition-colors flex-shrink-0">
              <Heart size={16} />
            </button>
          </>
        ) : (
          <div className="text-sp-muted text-xs">No song playing</div>
        )}
      </div>

      {/* Mobile song info (only title) */}
      <div className="flex md:hidden flex-col min-w-0 flex-1 mr-4">
        {currentSong && (
          <p className="text-sm font-semibold text-white truncate">
            {currentSong.name || currentSong.title}
          </p>
        )}
      </div>

      {/* Center: controls */}
      <div className="flex flex-col items-center gap-2 w-[40%]">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`transition-colors ${isShuffle ? "text-sp-green" : "text-sp-dim hover:text-white"}`}
          >
            <Shuffle size={18} />
          </button>

          <button
            onClick={prevSong}
            className="text-sp-dim hover:text-white transition-colors"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin text-black" />
            ) : isPlaying ? (
              <Pause size={18} fill="black" className="text-black" />
            ) : (
              <Play size={18} fill="black" className="text-black ml-0.5" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="text-sp-dim hover:text-white transition-colors"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`transition-colors ${repeatMode !== "none" ? "text-sp-green" : "text-sp-dim hover:text-white"}`}
          >
            <RepeatIcon size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full max-w-md">
          <span className="hidden md:block text-xs text-sp-muted w-8 text-right tabular-nums">
            {fmtTime(currentTime)}
          </span>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-1 rounded-full bg-[rgba(255,255,255,0.2)] relative cursor-pointer group progress-bar"
          >
            <div
              className="h-full rounded-full bg-white group-hover:bg-sp-green transition-colors"
              style={{ width: `${(progress || 0) * 100}%` }}
            />
          </div>
          <span className="hidden md:block text-xs text-sp-muted w-8 tabular-nums">
            {fmtTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: volume (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-2 w-[30%] justify-end">
        <button
          onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
          className="text-sp-dim hover:text-white transition-colors"
        >
          <VolumeIcon size={16} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24"
          style={{
            background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
          }}
        />
      </div>
    </footer>
  );
}

// ─── Sidebar ───────────────────────────────────────────
function Sidebar({
  view,
  setView,
  playlists,
  onPlaylistClick,
  onCreatePlaylist,
  onLogout,
  isOpen,
  onClose,
}) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-300 ease-in-out flex flex-col gap-2 h-full overflow-hidden`}
        style={{ width: 280, minWidth: 280, background: "black" }}
      >
      {/* Top Nav */}
      <nav
        className="rounded-lg p-5 flex flex-col gap-6"
        style={{ background: "#121212" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 text-white font-black text-xl">
          <div className="w-8 h-8 bg-sp-green rounded-full flex items-center justify-center">
            <Music2 size={16} className="text-black" />
          </div>
          Melodix
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => setView("home")}
            className={`flex items-center gap-4 px-3 py-2 rounded-full text-sm font-bold transition-all ${
              view === "home"
                ? "text-white bg-[rgba(255,255,255,0.1)]"
                : "text-sp-dim hover:text-white"
            }`}
          >
            <Home size={22} />
            Home
          </button>
          <button
            onClick={() => setView("search")}
            className={`flex items-center gap-4 px-3 py-2 rounded-full text-sm font-bold transition-all ${
              view === "search"
                ? "text-white bg-[rgba(255,255,255,0.1)]"
                : "text-sp-dim hover:text-white"
            }`}
          >
            <Search size={22} />
            Search
          </button>
        </div>
      </nav>

      {/* Library */}
      <div
        className="flex-1 rounded-lg overflow-hidden flex flex-col"
        style={{ background: "#121212" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 text-sp-dim font-bold text-sm">
            <Library size={20} />
            Your Library
          </div>
          <button
            onClick={onCreatePlaylist}
            title="Create playlist"
            className="w-8 h-8 rounded-full hover:bg-[rgba(255,255,255,0.1)] text-sp-dim hover:text-white flex items-center justify-center transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {playlists.length === 0 ? (
            <div className="px-2 py-4 text-sp-muted text-xs">
              <p className="font-bold text-sm text-white mb-1">Create your first playlist</p>
              <p>It's easy, we'll help you</p>
              <button
                onClick={onCreatePlaylist}
                className="mt-3 px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:scale-105 transition-transform"
              >
                Create playlist
              </button>
            </div>
          ) : (
            playlists.map((p) => (
              <button
                key={p._id}
                onClick={() => onPlaylistClick(p)}
                className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-all group text-left ${
                  view === `playlist-${p._id}` ? "bg-[rgba(255,255,255,0.06)]" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${getPlaylistCover(p._id)}`}
                >
                  {p.songs?.length > 0 ? (
                    <img
                      src={p.songs[0].thumbnail}
                      alt=""
                      className="w-full h-full rounded object-cover"
                    />
                  ) : (
                    <ListMusic size={16} className="text-white/60" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  <p className="text-xs text-sp-dim truncate">
                    Playlist · {p.songs?.length || 0} songs
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={onLogout}
            className="text-xs text-sp-muted hover:text-white transition-colors font-semibold"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}

// ─── HomeView ──────────────────────────────────────────
function HomeView({ playlists, onPlaylistClick, onCreatePlaylist }) {
  const { playSong } = usePlayer();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const handlePlayAll = (playlist) => {
    if (!playlist.songs?.length) return;
    playSong(playlist.songs[0], playlist.songs, 0);
    onPlaylistClick(playlist);
  };

  return (
    <div className="animate-in">
      <h2 className="text-2xl font-black mb-6">{greeting}</h2>

      {/* Quick access grid */}
      {playlists.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {playlists.slice(0, 6).map((p) => (
            <button
              key={p._id}
              onClick={() => onPlaylistClick(p)}
              className="flex items-center gap-3 bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.12)] rounded-md overflow-hidden text-left transition-all group relative"
            >
              <div className="w-14 h-14 flex-shrink-0">
                {p.songs?.length > 0 ? (
                  <img src={p.songs[0].thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getPlaylistCover(p._id)}`} />
                )}
              </div>
              <span className="font-bold text-sm pr-3 truncate">{p.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handlePlayAll(p); }}
                className="absolute right-3 opacity-0 group-hover:opacity-100 transition-all w-10 h-10 bg-sp-green rounded-full flex items-center justify-center shadow-xl hover:scale-105"
              >
                <Play size={18} fill="black" className="text-black ml-0.5" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* All playlists */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black">Your playlists</h3>
        <button
          onClick={onCreatePlaylist}
          className="text-sm text-sp-dim hover:text-white font-semibold transition-colors"
        >
          Show all
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="py-16 text-center">
          <ListMusic size={48} className="mx-auto text-sp-muted mb-4" />
          <p className="text-lg font-bold mb-2">No playlists yet</p>
          <p className="text-sp-dim text-sm mb-6">Create your first playlist to get started</p>
          <button
            onClick={onCreatePlaylist}
            className="px-6 py-3 bg-sp-green text-black font-bold rounded-full text-sm hover:bg-sp-green-h hover:scale-105 transition-all"
          >
            Create playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {playlists.map((p) => (
            <PlaylistCard key={p._id} playlist={p} onClick={() => onPlaylistClick(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PlaylistCard ──────────────────────────────────────
function PlaylistCard({ playlist: p, onClick }) {
  const { playSong } = usePlayer();

  return (
    <div
      onClick={onClick}
      className="group p-4 rounded-lg cursor-pointer transition-all hover:bg-sp-hover relative"
      style={{ background: "#181818" }}
    >
      <div className="aspect-square rounded-md overflow-hidden mb-3 shadow-lg relative">
        {p.songs?.length > 0 ? (
          <img src={p.songs[0].thumbnail} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getPlaylistCover(p._id)} flex items-center justify-center`}>
            <ListMusic size={32} className="text-white/60" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (p.songs?.length) playSong(p.songs[0], p.songs, 0);
          }}
          className="absolute bottom-2 right-2 w-10 h-10 bg-sp-green rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
        >
          <Play size={18} fill="black" className="text-black ml-0.5" />
        </button>
      </div>
      <p className="font-bold text-sm text-white truncate">{p.name}</p>
      <p className="text-xs text-sp-dim mt-1">{p.songs?.length || 0} songs</p>
    </div>
  );
}

// ─── SearchView ────────────────────────────────────────
function SearchView({ selectedPlaylist, playlists, onPlaylistSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const { showToast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchYouTube(query);
      setResults(data);
    } catch {
      showToast("Search failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (song) => {
    if (!selectedPlaylist) {
      showToast("Select a playlist first", "error");
      return;
    }
    setAddingId(song.videoId);
    try {
      await addSongFromYouTube(selectedPlaylist._id, {
        name: song.title,
        artist: song.artist,
        album: "YouTube",
        duration: song.duration,
        youtubeId: song.videoId,
        youtubeLink: song.youtubeLink,
        thumbnail: song.thumbnail,
      });
      showToast(`Added to ${selectedPlaylist.name}`, "success");
    } catch {
      showToast("Failed to add song", "error");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="animate-in">
      <h2 className="text-2xl font-black mb-6">Search</h2>

      {/* Playlist selector */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-sp-dim">Add to:</span>
        <select
          value={selectedPlaylist?._id || ""}
          onChange={(e) => {
            const pl = playlists.find((p) => p._id === e.target.value);
            if (pl) onPlaylistSelect(pl);
          }}
          className="bg-sp-elevated border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md px-3 py-2 outline-none cursor-pointer"
        >
          <option value="" disabled>Select playlist</option>
          {playlists.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Search input */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" />
          <input
            type="text"
            placeholder="What do you want to play?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full bg-white text-black placeholder:text-[#737373] rounded-full py-3 pl-10 pr-4 text-sm font-semibold outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-sp-green text-black font-bold rounded-full text-sm hover:bg-sp-green-h transition-all"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Search"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">Results</h3>
          <div className="flex flex-col gap-1">
            {results.map((song, i) => (
              <div
                key={song.videoId}
                className="flex items-center gap-4 p-3 rounded-md hover:bg-sp-hover transition-all group"
              >
                <span className="text-sp-muted text-sm w-4 text-center group-hover:hidden">{i + 1}</span>
                <Play size={14} className="text-white hidden group-hover:block w-4" fill="currentColor" />
                <img src={song.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                  <p className="text-xs text-sp-dim truncate">{song.artist}</p>
                </div>
                <span className="text-xs text-sp-muted font-mono">{song.duration}</span>
                <button
                  onClick={() => handleAdd(song)}
                  disabled={addingId === song.videoId}
                  className="px-4 py-1.5 rounded-full border border-sp-dim text-sp-dim hover:border-white hover:text-white text-xs font-bold transition-all"
                >
                  {addingId === song.videoId ? <Loader2 size={12} className="animate-spin" /> : "+ Add"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PlaylistView ──────────────────────────────────────
function PlaylistView({ playlist, onBack, onUpdate, onDelete }) {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const { showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playlist.name);
  const [deletingId, setDeletingId] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handlePlay = (song, idx) => {
    if (currentSong?.youtubeId === song.youtubeId && isPlaying) {
      togglePlay();
    } else {
      playSong(song, playlist.songs, idx);
    }
  };

  const handlePlayAll = () => {
    if (!playlist.songs?.length) return;
    playSong(playlist.songs[0], playlist.songs, 0);
  };

  const handleRename = async () => {
    if (!nameInput.trim()) return;
    try {
      await updatePlaylist(playlist._id, nameInput);
      onUpdate({ ...playlist, name: nameInput });
      showToast("Renamed!", "success");
    } catch {
      showToast("Failed to rename", "error");
    }
    setEditingName(false);
  };

  const handleDeleteSong = async (songId) => {
    setDeletingId(songId);
    try {
      await deleteSong(playlist._id, songId);
      onUpdate({ ...playlist, songs: playlist.songs.filter((s) => s._id !== songId) });
      showToast("Song removed", "success");
    } catch {
      showToast("Failed to remove", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const isCurrent = (song) => currentSong?.youtubeId === song.youtubeId;

  const cover =
    playlist.songs?.length > 0
      ? playlist.songs[0].thumbnail
      : null;

  return (
    <div className="animate-in">
      {/* Header */}
      <div
        className="flex flex-col md:flex-row items-end gap-6 p-6 rounded-t-xl mb-4"
        style={{
          background: `linear-gradient(to bottom, rgba(29,185,84,0.25) 0%, #121212 100%)`,
        }}
      >
        {/* Cover art */}
        <div className="w-44 h-44 md:w-56 md:h-56 rounded-lg shadow-2xl overflow-hidden flex-shrink-0">
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getPlaylistCover(playlist._id)} flex items-center justify-center`}>
              <ListMusic size={44} className="text-white/60" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-widest">Playlist</span>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingName(false); }}
                className="bg-transparent border-b-2 border-white text-4xl font-black text-white w-full outline-none"
              />
              <button onClick={handleRename} className="text-sp-green hover:text-sp-green-h text-sm font-bold">Save</button>
              <button onClick={() => setEditingName(false)} className="text-sp-dim text-sm">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingName(true); setNameInput(playlist.name); }}
              className="text-4xl md:text-6xl font-black text-white text-left hover:opacity-80 transition-opacity"
            >
              {playlist.name}
            </button>
          )}
          <p className="text-sp-dim text-sm">{playlist.songs?.length || 0} songs</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4 px-2 mb-6">
        <button
          onClick={handlePlayAll}
          disabled={!playlist.songs?.length}
          className="w-14 h-14 bg-sp-green rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40 shadow-xl"
        >
          <Play size={24} fill="black" className="text-black ml-1" />
        </button>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="px-5 py-2 rounded-full border border-sp-dim text-sp-dim hover:border-white hover:text-white text-sm font-bold transition-all"
        >
          + Add songs
        </button>
        <button
          onClick={() => onDelete(playlist._id)}
          className="w-9 h-9 rounded-full hover:bg-sp-hover flex items-center justify-center text-sp-dim hover:text-white transition-all"
          title="Delete playlist"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Song list */}
      {playlist.songs?.length > 0 ? (
        <div className="bg-[#121212] lg:bg-transparent">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_auto_5rem_3rem] gap-4 px-4 mb-2 text-xs text-sp-muted uppercase tracking-wider font-bold border-b border-[rgba(255,255,255,0.06)] pb-2">
            <span>#</span>
            <span>Title</span>
            <span className="hidden md:block">Artist</span>
            <span className="hidden md:block">Duration</span>
            <span />
          </div>

          {playlist.songs.map((song, idx) => (
            <div
              key={song._id}
              onClick={() => handlePlay(song, idx)}
              className={`grid grid-cols-[3rem_1fr_auto] md:grid-cols-[2rem_1fr_auto_5rem_3rem] gap-4 px-2 md:px-4 py-2.5 rounded-md transition-all cursor-pointer group hover:bg-sp-hover ${
                isCurrent(song) ? "bg-[rgba(29,185,84,0.06)]" : ""
              }`}
            >
              {/* # / play */}
              <div className="flex items-center justify-center">
                <span className={`text-sm md:group-hover:hidden ${isCurrent(song) ? "text-sp-green font-bold" : "text-sp-muted"}`}>
                  {isCurrent(song) && isPlaying ? "♫" : idx + 1}
                </span>
                <button
                  className="hidden md:group-hover:flex items-center justify-center transition-all"
                >
                  {isCurrent(song) && isPlaying ? (
                    <Pause size={16} fill="white" className="text-white" />
                  ) : (
                    <Play size={16} fill="white" className="text-white" />
                  )}
                </button>
              </div>

              {/* Title + thumbnail */}
              <div className="flex items-center gap-3 min-w-0">
                <img src={song.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isCurrent(song) ? "text-sp-green" : "text-white"}`}>
                    {song.name}
                  </p>
                  <p className="text-xs text-sp-dim truncate md:hidden">{song.artist}</p>
                </div>
              </div>

              {/* Artist (desk) */}
              <p className="hidden md:flex items-center text-sm text-sp-dim truncate">{song.artist}</p>

              {/* Duration */}
              <p className="hidden md:flex items-center text-sm text-sp-muted font-mono">{song.duration}</p>

              {/* Delete */}
              <div className="flex items-center justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSong(song._id); }}
                  disabled={deletingId === song._id}
                  className="opacity-0 group-hover:opacity-100 text-sp-dim hover:text-red-400 transition-all"
                >
                  {deletingId === song._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <ListMusic size={48} className="mx-auto text-sp-muted mb-4" />
          <p className="font-bold text-lg mb-2">This playlist is empty</p>
          <p className="text-sp-dim text-sm mb-4">Add some songs to get started</p>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="px-6 py-3 bg-sp-green text-black font-bold rounded-full text-sm hover:bg-sp-green-h transition-all"
          >
            Find songs
          </button>
        </div>
      )}

      {/* Add songs modal */}
      {isSearchOpen && (
        <AddSongsModal
          playlist={playlist}
          onUpdate={onUpdate}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
}

// ─── AddSongsModal ─────────────────────────────────────
function AddSongsModal({ playlist, onUpdate, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const { showToast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchYouTube(query);
      setResults(data);
    } catch {
      showToast("Search failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (song) => {
    setAddingId(song.videoId);
    try {
      const res = await addSongFromYouTube(playlist._id, {
        name: song.title,
        artist: song.artist,
        album: "YouTube",
        duration: song.duration,
        youtubeId: song.videoId,
        youtubeLink: song.youtubeLink,
        thumbnail: song.thumbnail,
      });
      onUpdate(res.playlist);
      showToast(`Added "${song.title}"`, "success");
    } catch {
      showToast("Failed to add", "error");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col animate-in"
        style={{ background: "#282828", maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <h3 className="font-black text-lg">Add to {playlist.name}</h3>
          <button onClick={onClose} className="text-sp-dim hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              autoFocus
              type="text"
              placeholder="Search for songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full bg-white text-black placeholder:text-[#737373] rounded-full py-2.5 pl-10 pr-4 text-sm outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-2.5 bg-sp-green text-black rounded-full text-sm font-bold hover:bg-sp-green-h transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Search"}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {results.map((song, i) => (
            <div
              key={song.videoId}
              className="flex items-center gap-4 px-6 py-3 hover:bg-[rgba(255,255,255,0.06)] transition-all"
            >
              <img src={song.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                <p className="text-xs text-sp-dim truncate">{song.artist} · {song.duration}</p>
              </div>
              <button
                onClick={() => handleAdd(song)}
                disabled={addingId === song.videoId}
                className="px-4 py-1.5 rounded-full border border-sp-dim text-sp-dim hover:border-white hover:text-white text-xs font-bold transition-all flex-shrink-0"
              >
                {addingId === song.videoId ? <Loader2 size={12} className="animate-spin" /> : "Add"}
              </button>
            </div>
          ))}
          {results.length === 0 && query && !loading && (
            <div className="text-center py-12 text-sp-muted text-sm">No results. Try a different search.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CreatePlaylistModal ────────────────────────────────
function CreatePlaylistModal({ onClose, onCreate }) {
  const [name, setName] = useState("My Playlist #1");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-xl p-6 animate-in"
        style={{ background: "#282828" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-lg">Create playlist</h3>
          <button onClick={onClose} className="text-sp-dim hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="aspect-square w-full rounded-lg flex items-center justify-center mb-4"
            style={{ background: "#3a3a3a" }}
          >
            <ListMusic size={64} className="text-sp-muted" />
          </div>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#3a3a3a] text-white rounded-md px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-white/30"
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-white hover:scale-105 transition-transform"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-sp-green text-black font-bold rounded-full text-sm hover:bg-sp-green-h hover:scale-105 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard (root) ──────────────────────────────────
export default function Dashboard() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home"); // "home" | "search" | "playlist-<id>"
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const fetchPlaylists = useCallback(async () => {
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (err) {
      if (err.status === 401) {
        // Real auth failure — token is invalid/expired
        showToast("Session expired. Please log in again.", "error");
        setTimeout(() => { logout(); navigate("/"); }, 2000);
      } else {
        // Network error, server error, CORS etc. — don't log out
        showToast("Could not load playlists. Check your connection.", "error");
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaylists(); }, []);

  const handleCreate = async (name) => {
    try {
      const res = await createPlaylist(name);
      setPlaylists((prev) => [res.playlist, ...prev]);
      handlePlaylistClick(res.playlist);
      showToast(`Created "${name}"`, "success");
    } catch {
      showToast("Failed to create playlist", "error");
    }
  };

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    setView(`playlist-${playlist._id}`);
  };

  const handlePlaylistUpdate = (updated) => {
    setSelectedPlaylist(updated);
    setPlaylists((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  const handlePlaylistDelete = async (id) => {
    try {
      await deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p._id !== id));
      setView("home");
      setSelectedPlaylist(null);
      showToast("Playlist deleted", "success");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleLogout = () => { logout(); navigate("/"); };

  if (loading) {
    return (
      <div className="h-screen bg-sp-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-sp-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPlaylistView = view.startsWith("playlist-");
  const currentPlaylist = isPlaylistView
    ? playlists.find((p) => p._id === selectedPlaylist?._id) || selectedPlaylist
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-sp-black">
      {/* Main layout (sidebar + content) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          view={view}
          setView={(v) => { setView(v); setIsSidebarOpen(false); }}
          playlists={playlists}
          onPlaylistClick={(p) => { handlePlaylistClick(p); setIsSidebarOpen(false); }}
          onCreatePlaylist={() => { setShowCreate(true); setIsSidebarOpen(false); }}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main content area */}
        <main
          className="flex-1 relative overflow-y-auto main-scroll scroll-smooth lg:m-2 lg:rounded-lg"
          style={{ background: "#121212" }}
        >
          {/* Header for mobile */}
          <header className="lg:hidden sticky top-0 z-20 flex items-center p-4 bg-[#121212]/90 backdrop-blur-sm">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-white hover:text-sp-green transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="ml-4 flex items-center gap-2 font-black text-white">
               <Music2 size={24} className="text-sp-green" />
               Melodix
            </div>
          </header>

          <div className="p-4 lg:p-6 pb-[120px]">
            {view === "home" && (
              <HomeView
                playlists={playlists}
                onPlaylistClick={handlePlaylistClick}
                onCreatePlaylist={() => setShowCreate(true)}
              />
            )}

            {view === "search" && (
              <SearchView
                selectedPlaylist={selectedPlaylist}
                playlists={playlists}
                onPlaylistSelect={(p) => setSelectedPlaylist(p)}
              />
            )}

            {isPlaylistView && currentPlaylist && (
              <PlaylistView
                key={currentPlaylist._id}
                playlist={currentPlaylist}
                onBack={() => setView("home")}
                onUpdate={handlePlaylistUpdate}
                onDelete={handlePlaylistDelete}
              />
            )}
          </div>
        </main>
      </div>

      {/* Bottom Player Bar */}
      <PlayerBar />

      {/* Create playlist modal */}
      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
