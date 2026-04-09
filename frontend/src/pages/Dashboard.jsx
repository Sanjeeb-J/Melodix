import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  History,
  Home,
  Library,
  Loader2,
  LogOut,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import logo from "../assets/logo.png";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../components/ToastContainer";
import { getCurrentUser } from "../services/authService";
import { searchYouTube } from "../services/youtubeService";
import { addSongFromYouTube, createPlaylist, deletePlaylist, getPlaylists, updatePlaylist } from "../services/playlistService";
import { addRecentPlay, getLibraryHome, getLikedSongs, getProfile, getRecentPlays, toggleLikeSong, updateProfile } from "../services/libraryService";

const FALLBACK_ART = "https://placehold.co/500x500/111111/FFFFFF?text=Melodix";

const views = [
  ["home", "Home", Home],
  ["search", "Search", Search],
  ["playlists", "Playlists", Library],
  ["liked", "Liked Songs", Heart],
  ["recent", "Recent", History],
  ["profile", "Profile", UserRound],
];

const fmtTime = (s) => {
  if (!s || Number.isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const relDate = (value) => {
  if (!value) return "Just now";
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const artForPlaylist = (playlist) => playlist?.coverImage || playlist?.songs?.[0]?.thumbnail || FALLBACK_ART;

const collectTracks = (playlists, likedSongs, recentPlays, searchResults, recommendations) => {
  const merged = [
    ...likedSongs,
    ...recentPlays.map((entry) => entry.track),
    ...searchResults,
    ...recommendations,
    ...playlists.flatMap((playlist) => playlist.songs || []),
  ];

  return merged.filter(
    (track, index, array) =>
      track && (track.youtubeId || track.videoId) &&
      array.findIndex((item) => (item.youtubeId || item.videoId) === (track.youtubeId || track.videoId)) === index
  );
};

const buildEntityCards = (tracks, key) => {
  const groups = new Map();

  tracks.forEach((track) => {
    const value = (track[key] || (key === "album" ? "Singles & One-Offs" : "Unknown Artist")).trim();
    if (!groups.has(value)) {
      groups.set(value, {
        name: value,
        image: track.thumbnail || FALLBACK_ART,
        tracks: [],
      });
    }
    groups.get(value).tracks.push(track);
  });

  return Array.from(groups.values())
    .map((entry) => ({ ...entry, count: entry.tracks.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
};

function Card({ title, subtitle, image, onClick, action }) {
  return (
    <button onClick={onClick} className="group rounded-[28px] border border-white/8 bg-white/5 p-3 text-left transition hover:-translate-y-1 hover:bg-white/8">
      <img src={image || FALLBACK_ART} alt="" className="aspect-square w-full rounded-[22px] object-cover" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-white/55">{subtitle}</p>
        </div>
        {action}
      </div>
    </button>
  );
}

function Row({ track, index, liked, meta, onPlay, onLike, onAdd }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-white/6">
      <button onClick={onPlay} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#1db954] hover:text-black">
        <Play size={14} fill="currentColor" className="ml-0.5" />
      </button>
      <div className="flex min-w-0 items-center gap-3">
        <div className="w-5 text-xs font-semibold text-white/40">{index + 1}</div>
        <img src={track.thumbnail || FALLBACK_ART} alt="" className="h-12 w-12 rounded-2xl object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{track.name || track.title}</p>
          <p className="truncate text-xs text-white/55">{track.artist || "Unknown artist"} {meta ? `· ${meta}` : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onLike} className={liked ? "text-[#1db954]" : "text-white/45 hover:text-white"}>
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
        </button>
        {onAdd ? (
          <button onClick={onAdd} className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/75 transition hover:text-white">
            Add
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#101010] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/65 transition hover:text-white">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PlaylistModal({ initialValue, onClose, onSave, saving }) {
  const [name, setName] = useState(initialValue?.name || "");

  return (
    <ModalShell
      title={initialValue ? "Rename Playlist" : "Create Playlist"}
      subtitle={initialValue ? "Give your playlist a sharper identity." : "Build a new collection without leaving the app."}
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Late Night Drive"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white">Cancel</button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={saving || !name.trim()}
            className="rounded-full bg-[#1db954] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#1ed760] disabled:opacity-50"
          >
            {saving ? "Saving..." : initialValue ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function AddTrackModal({ playlists, track, onClose, onSelect, saving }) {
  return (
    <ModalShell
      title="Add To Playlist"
      subtitle={`Choose where to save "${track?.name || track?.title}".`}
      onClose={onClose}
    >
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {playlists.length ? playlists.map((playlist) => (
          <button
            key={playlist._id}
            onClick={() => onSelect(playlist)}
            disabled={saving}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8 disabled:opacity-50"
          >
            <img src={artForPlaylist(playlist)} alt="" className="h-12 w-12 rounded-2xl object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
              <p className="truncate text-xs text-white/55">{playlist.songs?.length || 0} tracks</p>
            </div>
          </button>
        )) : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/55">Create a playlist first.</div>}
      </div>
    </ModalShell>
  );
}

function ProfileModal({ initialUser, onClose, onSave, saving }) {
  const [name, setName] = useState(initialUser?.name || "");
  const [bio, setBio] = useState(initialUser?.bio || "");
  const [genres, setGenres] = useState((initialUser?.favoriteGenres || []).join(", "));

  return (
    <ModalShell title="Edit Profile" subtitle="Update your identity, vibe, and favorite genres." onClose={onClose}>
      <div className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]" />
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell listeners about your taste." className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]" />
        <input value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="indie, pop, electronic" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white">Cancel</button>
          <button
            onClick={() => onSave({ name: name.trim(), bio, favoriteGenres: genres.split(",").map((genre) => genre.trim()).filter(Boolean) })}
            disabled={saving || !name.trim()}
            className="rounded-full bg-[#1db954] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#1ed760] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function PlayerDock() {
  const { currentSong, isPlaying, isShuffle, repeatMode, progress, duration, currentTime, volume, isMuted, isLoading, upcomingQueue, togglePlay, nextSong, prevSong, seek, setVolume, toggleMute, toggleShuffle, toggleRepeat } = usePlayer();
  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : Volume2;

  return (
    <footer className="sticky bottom-0 z-20 border-t border-white/8 bg-[#090909]/95 px-3 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3 lg:w-[28%]">
          {currentSong ? (
            <>
              <img src={currentSong.thumbnail || FALLBACK_ART} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{currentSong.name || currentSong.title}</p>
                <p className="truncate text-xs text-white/55">{currentSong.artist || "Unknown artist"}</p>
                {isLoading ? <p className="text-[11px] text-[#1db954]">Buffering...</p> : null}
              </div>
            </>
          ) : <p className="text-sm text-white/55">Start playing something great.</p>}
        </div>

        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <button onClick={toggleShuffle} className={isShuffle ? "text-[#1db954]" : "text-white/55 hover:text-white"}><Shuffle size={16} /></button>
            <button onClick={prevSong} className="rounded-full p-2 text-white/60 hover:bg-white/8 hover:text-white"><SkipBack size={18} fill="currentColor" /></button>
            <button onClick={togglePlay} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:scale-105">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={nextSong} className="rounded-full p-2 text-white/60 hover:bg-white/8 hover:text-white"><SkipForward size={18} fill="currentColor" /></button>
            <button onClick={toggleRepeat} className={repeatMode !== "none" ? "text-[#1db954]" : "text-white/55 hover:text-white"}><RepeatIcon size={16} /></button>
          </div>
          <div className="flex w-full max-w-2xl items-center gap-3">
            <span className="w-10 text-right text-[11px] text-white/45">{fmtTime(currentTime)}</span>
            <input type="range" min={0} max={1} step={0.001} value={progress || 0} onChange={(e) => seek(Number(e.target.value))} className="w-full" style={{ background: `linear-gradient(to right, #1db954 ${(progress || 0) * 100}%, rgba(255,255,255,0.12) ${(progress || 0) * 100}%)` }} />
            <span className="w-10 text-[11px] text-white/45">{fmtTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:w-[28%] lg:justify-end">
          <span className="text-xs text-white/45">{upcomingQueue.length} queued</span>
          <button onClick={toggleMute} className="text-white/60 hover:text-white"><VolumeIcon size={16} /></button>
          <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-28" style={{ background: `linear-gradient(to right, #1db954 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.12) ${(isMuted ? 0 : volume) * 100}%)` }} />
        </div>
      </div>
    </footer>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { playSong } = usePlayer();
  const [activeView, setActiveView] = useState("home");
  const [playlists, setPlaylists] = useState([]);
  const [homeFeed, setHomeFeed] = useState(null);
  const [profile, setProfile] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [playlistModal, setPlaylistModal] = useState(null);
  const [addTrackModal, setAddTrackModal] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [entityDetail, setEntityDetail] = useState(null);
  const [savingState, setSavingState] = useState({ playlist: false, addTrack: false, profile: false });

  const likedIds = useMemo(() => new Set(likedSongs.map((track) => track.youtubeId)), [likedSongs]);
  const selectedPlaylist = playlists.find((playlist) => playlist._id === selectedPlaylistId) || null;
  const stats = profile?.stats || {
    playlists: playlists.length,
    likedSongs: likedSongs.length,
    recentlyPlayed: recentPlays.length,
    libraryTracks: playlists.reduce((sum, p) => sum + (p.songs?.length || 0), 0),
  };
  const recommendations = homeFeed?.sections?.recommendations?.length ? homeFeed.sections.recommendations : likedSongs.slice(0, 8);
  const quickAccess = homeFeed?.sections?.quickAccess?.length ? homeFeed.sections.quickAccess : playlists.slice(0, 6);
  const libraryTracks = useMemo(
    () => collectTracks(playlists, likedSongs, recentPlays, searchResults, recommendations),
    [playlists, likedSongs, recentPlays, searchResults, recommendations]
  );
  const topArtists = useMemo(() => buildEntityCards(libraryTracks, "artist"), [libraryTracks]);
  const topAlbums = useMemo(() => buildEntityCards(libraryTracks, "album"), [libraryTracks]);

  const loadApp = async () => {
    setLoading(true);
    try {
      const [userRes, profileRes, homeRes, playlistsRes, likesRes, recentRes] = await Promise.all([
        getCurrentUser(),
        getProfile(),
        getLibraryHome(),
        getPlaylists(),
        getLikedSongs(),
        getRecentPlays(),
      ]);
      setUser(userRes.user);
      setProfile(profileRes);
      setHomeFeed(homeRes);
      setPlaylists(playlistsRes);
      setLikedSongs(likesRes);
      setRecentPlays(recentRes);
    } catch (error) {
      showToast(error.message || "Could not load Melodix", "error");
      localStorage.removeItem("token");
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApp();
  }, []);

  const rememberPlay = (track, contextType = "search", contextId = "") => {
    const normalized = {
      name: track.name || track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      youtubeId: track.youtubeId || track.videoId,
      youtubeLink: track.youtubeLink || `https://www.youtube.com/watch?v=${track.youtubeId || track.videoId}`,
      thumbnail: track.thumbnail,
    };
    setRecentPlays((current) => [
      { track: normalized, playedAt: new Date().toISOString(), contextType, contextId },
      ...current.filter((entry) => entry.track.youtubeId !== normalized.youtubeId),
    ].slice(0, 30));
    addRecentPlay({ track: normalized, contextType, contextId }).catch(() => {});
  };

  const playTrack = (track, queue, index = 0, contextType = "search", contextId = "") => {
    playSong(track, queue, index);
    rememberPlay(track, contextType, contextId);
  };

  const playPlaylist = (playlist) => {
    if (!playlist?.songs?.length) {
      showToast("This playlist is empty", "info");
      return;
    }
    setSelectedPlaylistId(playlist._id);
    setActiveView("playlist");
    playTrack(playlist.songs[0], playlist.songs, 0, "playlist", playlist._id);
  };

  const likeTrack = async (track) => {
    try {
      const result = await toggleLikeSong({
        ...track,
        name: track.name || track.title,
        youtubeId: track.youtubeId || track.videoId,
        youtubeLink: track.youtubeLink || `https://www.youtube.com/watch?v=${track.youtubeId || track.videoId}`,
      });
      setLikedSongs(result.likedSongs);
      showToast(result.liked ? "Saved to Liked Songs" : "Removed from Liked Songs", "success");
    } catch (error) {
      showToast(error.message || "Could not update likes", "error");
    }
  };

  const runSearch = async (value = searchQuery) => {
    if (!value.trim()) return;
    setIsSearching(true);
    try {
      setSearchResults(await searchYouTube(value.trim()));
      setSearchQuery(value);
      setActiveView("search");
    } catch (error) {
      showToast(error.message || "Search failed", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const openCreatePlaylist = () => {
    setPlaylistModal({ mode: "create" });
  };

  const savePlaylist = async (name) => {
    setSavingState((current) => ({ ...current, playlist: true }));
    try {
      const response = await createPlaylist(name.trim());
      setPlaylists((current) => [response.playlist, ...current]);
      setSelectedPlaylistId(response.playlist._id);
      setActiveView("playlist");
      setPlaylistModal(null);
      showToast(`Created "${response.playlist.name}"`, "success");
    } catch (error) {
      showToast(error.message || "Could not create playlist", "error");
    } finally {
      setSavingState((current) => ({ ...current, playlist: false }));
    }
  };

  const addTrackToPlaylist = async (track) => {
    if (!playlists.length) {
      showToast("Create a playlist first", "info");
      return;
    }
    setAddTrackModal(track);
  };

  const addTrackToSelectedPlaylist = async (playlist) => {
    if (!addTrackModal) return;
    setSavingState((current) => ({ ...current, addTrack: true }));
    try {
      const response = await addSongFromYouTube(playlist._id, {
        name: addTrackModal.name || addTrackModal.title,
        artist: addTrackModal.artist,
        album: addTrackModal.album || "YouTube",
        duration: addTrackModal.duration,
        youtubeId: addTrackModal.youtubeId || addTrackModal.videoId,
        youtubeLink: addTrackModal.youtubeLink || `https://www.youtube.com/watch?v=${addTrackModal.youtubeId || addTrackModal.videoId}`,
        thumbnail: addTrackModal.thumbnail,
      });
      setPlaylists((current) => current.map((item) => (item._id === response.playlist._id ? response.playlist : item)));
      setAddTrackModal(null);
      showToast(`Added to ${playlist.name}`, "success");
    } catch (error) {
      showToast(error.message || "Could not add track", "error");
    } finally {
      setSavingState((current) => ({ ...current, addTrack: false }));
    }
  };

  const promptRenamePlaylist = (playlist) => {
    setPlaylistModal({ mode: "rename", playlist });
  };

  const saveRenamedPlaylist = async (nextName) => {
    if (!playlistModal?.playlist) return;
    setSavingState((current) => ({ ...current, playlist: true }));
    try {
      const response = await updatePlaylist(playlistModal.playlist._id, nextName.trim());
      setPlaylists((current) => current.map((item) => (item._id === response.playlist._id ? response.playlist : item)));
      setPlaylistModal(null);
      showToast("Playlist renamed", "success");
    } catch (error) {
      showToast(error.message || "Could not rename playlist", "error");
    } finally {
      setSavingState((current) => ({ ...current, playlist: false }));
    }
  };

  const removePlaylist = async (playlist) => {
    if (!window.confirm(`Delete "${playlist.name}"?`)) return;
    try {
      await deletePlaylist(playlist._id);
      setPlaylists((current) => current.filter((item) => item._id !== playlist._id));
      setSelectedPlaylistId(null);
      setActiveView("playlists");
      showToast("Playlist deleted", "success");
    } catch (error) {
      showToast(error.message || "Could not delete playlist", "error");
    }
  };

  const editProfile = () => {
    setProfileModalOpen(true);
  };

  const saveProfile = async ({ name, bio, favoriteGenres }) => {
    if (!name?.trim()) return;
    setSavingState((current) => ({ ...current, profile: true }));
    try {
      const response = await updateProfile({
        name: name.trim(),
        bio,
        favoriteGenres,
      });
      setProfile((current) => ({ ...current, user: response.user }));
      setUser(response.user);
      setProfileModalOpen(false);
      showToast("Profile updated", "success");
    } catch (error) {
      showToast(error.message || "Could not update profile", "error");
    } finally {
      setSavingState((current) => ({ ...current, profile: false }));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const renderRows = (rows, mode) => (
    <div className="rounded-[30px] border border-white/8 bg-white/4 p-3">
      {rows.length ? rows.map((entry, index) => {
        const track = mode === "recent" ? entry.track : entry;
        const meta = mode === "recent" ? relDate(entry.playedAt) : track.duration;
        const queue = mode === "recent" ? rows.map((item) => item.track) : rows;
        return (
          <Row
            key={`${track.youtubeId || track.videoId}-${index}`}
            track={track}
            index={index}
            liked={likedIds.has(track.youtubeId || track.videoId)}
            meta={meta}
            onPlay={() => playTrack(track, queue, index, mode === "recent" ? entry.contextType : mode, mode === "recent" ? entry.contextId : "")}
            onLike={() => likeTrack(track)}
            onAdd={() => addTrackToPlaylist(track)}
          />
        );
      }) : <div className="px-4 py-14 text-center text-sm text-white/55">Nothing here yet.</div>}
    </div>
  );

  const renderHome = () => (
    <div className="space-y-10">
      <section className="rounded-[36px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(29,185,84,0.2),transparent_28%),linear-gradient(135deg,#151515,#090909)] p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-[#87ebb0]">Melodix Premium Mode</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">{homeFeed?.greeting?.title || "A richer music app, rebuilt."}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">{homeFeed?.greeting?.subtitle || "Search, like, replay, and organize your sessions in a Spotify-style flow."}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => setActiveView("search")} className="rounded-full bg-[#1db954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#1ed760]">Start Listening</button>
          <button onClick={openCreatePlaylist} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6">Create Playlist</button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-black text-white">Quick access</h2>
          <button onClick={() => setActiveView("playlists")} className="text-sm font-semibold text-white/60 hover:text-white">See all</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickAccess.map((playlist) => (
            <button key={playlist._id} onClick={() => { setSelectedPlaylistId(playlist._id); setActiveView("playlist"); }} className="group flex items-center gap-3 rounded-[28px] border border-white/6 bg-white/5 p-3 text-left transition hover:bg-white/8">
              <img src={artForPlaylist(playlist)} alt="" className="h-16 w-16 rounded-[20px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{playlist.name}</p>
                <p className="truncate text-xs text-white/55">{playlist.songs?.length || 0} tracks</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1db954] text-black opacity-0 transition group-hover:opacity-100">
                <Play size={16} fill="currentColor" className="ml-0.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black text-white">Recommended for you</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recommendations.map((track, index) => (
            <Card
              key={`${track.youtubeId}-${index}`}
              title={track.name || track.title}
              subtitle={track.artist || "Unknown artist"}
              image={track.thumbnail}
              onClick={() => playTrack(track, recommendations, index, "recommendations")}
              action={
                <button onClick={(e) => { e.stopPropagation(); likeTrack(track); }} className={likedIds.has(track.youtubeId) ? "text-[#1db954]" : "text-white/45"}>
                  <Heart size={16} fill={likedIds.has(track.youtubeId) ? "currentColor" : "none"} />
                </button>
              }
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-black text-white">Top artists</h2>
            <span className="text-sm text-white/50">Based on your current library</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {topArtists.map((artist) => (
              <Card
                key={artist.name}
                title={artist.name}
                subtitle={`${artist.count} tracks in your orbit`}
                image={artist.image}
                onClick={() => { setEntityDetail({ type: "artist", ...artist }); setActiveView("detail"); }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-black text-white">Album moods</h2>
            <span className="text-sm text-white/50">Quick jumps into your album clusters</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {topAlbums.map((album) => (
              <Card
                key={album.name}
                title={album.name}
                subtitle={`${album.count} tracks gathered here`}
                image={album.image}
                onClick={() => { setEntityDetail({ type: "album", ...album }); setActiveView("detail"); }}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black text-white">Recently played</h2>
        {renderRows(recentPlays.slice(0, 8), "recent")}
      </section>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold">
          <Loader2 size={18} className="animate-spin text-[#1db954]" />
          Loading Melodix...
        </div>
      </div>
    );
  }

  let content = renderHome();
  if (activeView === "search") {
    content = (
      <div className="space-y-8">
        <section className="rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,rgba(29,185,84,0.14),rgba(12,12,12,0.98))] p-6">
          <h2 className="text-2xl font-black text-white">Search everything</h2>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} placeholder="Search for songs, artists, or vibes" className="w-full rounded-full border border-white/10 bg-black/35 px-12 py-4 text-sm text-white outline-none transition focus:border-[#1db954]" />
            </div>
            <button onClick={() => runSearch()} className="rounded-full bg-[#1db954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#1ed760]">
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </section>
        {renderRows(searchResults, "search")}
      </div>
    );
  }

  if (activeView === "playlists") {
    content = (
      <div className="space-y-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black text-white">Your playlists</h2>
          <button onClick={openCreatePlaylist} className="rounded-full bg-[#1db954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#1ed760]">New Playlist</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.length ? playlists.map((playlist) => (
            <Card
              key={playlist._id}
              title={playlist.name}
              subtitle={`${playlist.songs?.length || 0} songs`}
              image={artForPlaylist(playlist)}
              onClick={() => { setSelectedPlaylistId(playlist._id); setActiveView("playlist"); }}
              action={<button onClick={(e) => { e.stopPropagation(); playPlaylist(playlist); }} className="rounded-full bg-[#1db954] p-2 text-black"><Play size={16} fill="currentColor" className="ml-0.5" /></button>}
            />
          )) : <div className="col-span-full rounded-[32px] border border-dashed border-white/10 px-6 py-12 text-center text-white/55">No playlists yet.</div>}
        </div>
      </div>
    );
  }

  if (activeView === "playlist" && selectedPlaylist) {
    content = (
      <div className="space-y-8">
        <section className="rounded-[36px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(12,12,12,0.98))] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <img src={artForPlaylist(selectedPlaylist)} alt="" className="aspect-square w-full max-w-[320px] rounded-[32px] object-cover" />
            <div className="flex flex-col justify-end">
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">Playlist</p>
              <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">{selectedPlaylist.name}</h1>
              <p className="mt-3 text-sm text-white/60">{selectedPlaylist.songs?.length || 0} songs • Updated {relDate(selectedPlaylist.updatedAt)}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => playPlaylist(selectedPlaylist)} className="rounded-full bg-[#1db954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#1ed760]">Play Playlist</button>
                <button onClick={() => promptRenamePlaylist(selectedPlaylist)} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6">Rename</button>
                <button onClick={() => removePlaylist(selectedPlaylist)} className="rounded-full border border-red-400/25 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-400/10">Delete</button>
              </div>
            </div>
          </div>
        </section>
        {renderRows(selectedPlaylist.songs || [], "playlist")}
      </div>
    );
  }

  if (activeView === "detail" && entityDetail) {
    content = (
      <div className="space-y-8">
        <section className="rounded-[36px] border border-white/8 bg-[linear-gradient(135deg,rgba(29,185,84,0.12),rgba(12,12,12,0.98))] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <img src={entityDetail.image || FALLBACK_ART} alt="" className="aspect-square w-full max-w-[320px] rounded-[32px] object-cover" />
            <div className="flex flex-col justify-end">
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">{entityDetail.type}</p>
              <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">{entityDetail.name}</h1>
              <p className="mt-3 text-sm text-white/60">{entityDetail.count} tracks collected from your library and listening history.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => playTrack(entityDetail.tracks[0], entityDetail.tracks, 0, entityDetail.type, entityDetail.name)} className="rounded-full bg-[#1db954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#1ed760]">Play Mix</button>
                <button onClick={() => runSearch(entityDetail.name)} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6">Search More</button>
              </div>
            </div>
          </div>
        </section>
        {renderRows(entityDetail.tracks, entityDetail.type)}
      </div>
    );
  }

  if (activeView === "liked") {
    content = (
      <div className="space-y-8">
        <h2 className="text-2xl font-black text-white">Liked Songs</h2>
        {renderRows(likedSongs, "liked")}
      </div>
    );
  }

  if (activeView === "recent") {
    content = (
      <div className="space-y-8">
        <h2 className="text-2xl font-black text-white">Recently Played</h2>
        {renderRows(recentPlays, "recent")}
      </div>
    );
  }

  if (activeView === "profile") {
    content = (
      <div className="space-y-8">
        <section className="rounded-[36px] border border-white/8 bg-[linear-gradient(135deg,rgba(29,185,84,0.18),rgba(12,12,12,0.98))] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full text-4xl font-black text-black" style={{ background: profile?.user?.avatarColor || "#1db954" }}>
                {(profile?.user?.name || user?.name || "M").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#baf6cc]">Profile</p>
                <h1 className="mt-2 text-4xl font-black text-white">{profile?.user?.name || user?.name || "Melodix User"}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">{profile?.user?.bio || "Update your profile to show what sound defines you."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile?.user?.favoriteGenres || ["pop", "indie", "electronic"]).map((genre) => (
                    <span key={genre} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">{genre}</span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={editProfile} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6">Edit Profile</button>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[["Playlists", stats.playlists], ["Liked", stats.likedSongs], ["History", stats.recentlyPlayed], ["Library Tracks", stats.libraryTracks]].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-white/50">{label}</p>
              <p className="mt-3 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col xl:flex-row">
        <aside className="border-b border-white/8 bg-[#090909] px-4 py-4 xl:min-h-screen xl:w-[290px] xl:border-b-0 xl:border-r">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1db954]/15">
              <img src={logo} alt="Melodix" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-xl font-black">Melodix</p>
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Spotify-style mode</p>
            </div>
          </div>

          <nav className="mt-6 grid gap-2">
            {views.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveView(id)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeView === id ? "bg-white text-black" : "text-white/65 hover:bg-white/6 hover:text-white"}`}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-[28px] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Your library</p>
              <button onClick={openCreatePlaylist} className="rounded-full bg-[#1db954] p-2 text-black">
                <Plus size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {playlists.slice(0, 6).map((playlist) => (
                <button key={playlist._id} onClick={() => { setSelectedPlaylistId(playlist._id); setActiveView("playlist"); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-white/6">
                  <img src={artForPlaylist(playlist)} alt="" className="h-11 w-11 rounded-2xl object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
                    <p className="truncate text-xs text-white/50">{playlist.songs?.length || 0} tracks</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black text-black" style={{ background: user?.avatarColor || "#1db954" }}>
                {(user?.name || "M").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.name || "Melodix User"}</p>
                <p className="truncate text-xs text-white/50">{user?.email}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <button onClick={editProfile} className="rounded-2xl border border-white/8 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:text-white">Edit profile</button>
              <button onClick={logout} className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:text-white">
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-white/8 bg-[#050505]/90 px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Streaming workspace</p>
                <h1 className="mt-1 text-2xl font-black text-white">{views.find(([id]) => id === activeView)?.[1] || selectedPlaylist?.name || "Melodix"}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 md:block">{stats.likedSongs} liked • {stats.playlists} playlists</div>
                <button onClick={() => setActiveView("search")} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/8">
                  <Search size={16} />
                  Search
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6">{content}</main>
          <PlayerDock />
        </div>
      </div>

      {playlistModal ? (
        <PlaylistModal
          initialValue={playlistModal.mode === "rename" ? playlistModal.playlist : null}
          onClose={() => setPlaylistModal(null)}
          onSave={playlistModal.mode === "rename" ? saveRenamedPlaylist : savePlaylist}
          saving={savingState.playlist}
        />
      ) : null}

      {addTrackModal ? (
        <AddTrackModal
          playlists={playlists}
          track={addTrackModal}
          onClose={() => setAddTrackModal(null)}
          onSelect={addTrackToSelectedPlaylist}
          saving={savingState.addTrack}
        />
      ) : null}

      {profileModalOpen ? (
        <ProfileModal
          initialUser={profile?.user || user}
          onClose={() => setProfileModalOpen(false)}
          onSave={saveProfile}
          saving={savingState.profile}
        />
      ) : null}
    </div>
  );
}
