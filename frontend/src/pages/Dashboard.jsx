import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Heart,
  Library,
  ListMusic,
  Loader2,
  Maximize2,
  Mic2,
  MonitorUp,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import logo from "../assets/logo.png";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../components/ToastContainer";
import { getCurrentUser } from "../services/authService";
import { searchYouTube } from "../services/youtubeService";
import {
  addSongFromYouTube,
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  updatePlaylist,
} from "../services/playlistService";
import {
  addRecentPlay,
  getLibraryHome,
  getLikedSongs,
  getProfile,
  getRecentPlays,
  toggleLikeSong,
  updateProfile,
} from "../services/libraryService";

const FALLBACK_ART = "https://placehold.co/500x500/111111/FFFFFF?text=Melodix";
const MOBILE_TABS = ["home", "search", "library", "profile"];
const DESKTOP_FILTERS = ["All", "Music", "Podcasts"];
const RIGHT_TABS = ["queue", "recent", "info", "lyrics"];

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const relativeDate = (value) => {
  if (!value) return "Just now";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const playlistArt = (playlist) =>
  playlist?.coverImage || playlist?.songs?.[0]?.thumbnail || FALLBACK_ART;

const normalizeTrack = (track) => ({
  ...track,
  name: track.name || track.title,
  title: track.title || track.name,
  youtubeId: track.youtubeId || track.videoId,
  videoId: track.videoId || track.youtubeId,
  youtubeLink:
    track.youtubeLink ||
    `https://www.youtube.com/watch?v=${track.youtubeId || track.videoId}`,
  thumbnail: track.thumbnail || FALLBACK_ART,
  artist: track.artist || "Unknown artist",
  album: track.album || "Single",
  duration: track.duration || "--:--",
});

const buildLyrics = (track) => {
  const words = `${track?.name || "Melodix"} ${track?.artist || "Music"} ${
    track?.album || "Session"
  }`
    .split(" ")
    .filter(Boolean);
  const seed = [
    "We were chasing midnight through electric city lights",
    "Every heartbeat feels louder when the room turns to neon",
    "Keep the chorus close, let the silence fall behind",
    "All the broken edges glow when the rhythm lands just right",
    "Hold on to the echo, it still sounds like tomorrow",
    "Melodix in motion, every memory set to fire",
  ];

  return seed.map((line, index) => ({
    id: `${track?.youtubeId || "track"}-${index}`,
    text:
      index % 2 === 0
        ? `${line} ${words[index % words.length] || ""}`.trim()
        : `${words[index % words.length] || "Tonight"} ${line}`.trim(),
    progressStart: index * 0.16,
    progressEnd: index * 0.16 + 0.14,
  }));
};

const collectTracks = (...groups) =>
  groups
    .flat()
    .filter(Boolean)
    .flatMap((entry) => {
      if (Array.isArray(entry)) return entry;
      if (entry?.songs) return entry.songs;
      if (entry?.track) return entry.track;
      return entry;
    })
    .filter(Boolean)
    .map(normalizeTrack);

const dedupeTracks = (tracks) => {
  const seen = new Set();
  return tracks.filter((track) => {
    const key = track.youtubeId || track.videoId || `${track.name}-${track.artist}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function ModalFrame({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#111111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/65 transition hover:text-white"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PlaylistModal({ mode, initialName, saving, onClose, onSave }) {
  const [name, setName] = useState(initialName || "");

  return (
    <ModalFrame
      title={mode === "rename" ? "Rename Playlist" : "Create Playlist"}
      subtitle={
        mode === "rename"
          ? "Give this collection a stronger identity."
          : "Build a new collection without leaving the player."
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Late Night Drive"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={saving || !name.trim()}
            className="rounded-full bg-[#1db954] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#1ed760] disabled:opacity-50"
          >
            {saving ? "Saving..." : mode === "rename" ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function AddTrackModal({ playlists, track, saving, onClose, onSelect }) {
  return (
    <ModalFrame
      title="Add To Playlist"
      subtitle={`Save "${track?.name || track?.title}" into one of your collections.`}
      onClose={onClose}
    >
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {playlists.length ? (
          playlists.map((playlist) => (
            <button
              key={playlist._id}
              onClick={() => onSelect(playlist)}
              disabled={saving}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8 disabled:opacity-50"
            >
              <img
                src={playlistArt(playlist)}
                alt=""
                className="h-12 w-12 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
                <p className="truncate text-xs text-white/55">
                  {playlist.songs?.length || 0} tracks
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/55">
            Create a playlist first.
          </div>
        )}
      </div>
    </ModalFrame>
  );
}

function ProfileModal({ user, saving, onClose, onSave }) {
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [genres, setGenres] = useState((user?.favoriteGenres || []).join(", "));

  return (
    <ModalFrame
      title="Edit Profile"
      subtitle="Update your identity, vibe, and favorite genres."
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Display name"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]"
        />
        <textarea
          rows={4}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Tell listeners about your taste."
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]"
        />
        <input
          value={genres}
          onChange={(event) => setGenres(event.target.value)}
          placeholder="indie, pop, electronic"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#1db954]"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name: name.trim(),
                bio: bio.trim(),
                favoriteGenres: genres
                  .split(",")
                  .map((genre) => genre.trim())
                  .filter(Boolean),
              })
            }
            disabled={saving || !name.trim()}
            className="rounded-full bg-[#1db954] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#1ed760] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function DesktopPlayerBar({
  currentSong,
  isPlaying,
  isShuffle,
  repeatMode,
  progress,
  duration,
  currentTime,
  volume,
  isMuted,
  isLoading,
  queueCount,
  rightTab,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
  onSeek,
  onSetVolume,
  onToggleMute,
  onOpenQueue,
  onOpenLyrics,
}) {
  return (
    <footer className="hidden h-[92px] shrink-0 border-t border-white/6 bg-black px-5 md:flex">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(380px,580px)_minmax(0,1fr)] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {currentSong ? (
            <>
              <img
                src={currentSong.thumbnail || FALLBACK_ART}
                alt=""
                className="h-14 w-14 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {currentSong.name || currentSong.title}
                </p>
                <p className="truncate text-xs text-white/55">{currentSong.artist}</p>
              </div>
              <button className="rounded-full p-2 text-[#1db954] transition hover:bg-white/8">
                <Heart size={16} fill="currentColor" />
              </button>
            </>
          ) : (
            <div className="text-sm text-white/45">Choose something to play</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onToggleShuffle}
              className={`rounded-full p-2 transition ${
                isShuffle ? "text-[#1db954]" : "text-white/55 hover:text-white"
              }`}
            >
              <Shuffle size={16} />
            </button>
            <button
              onClick={onPrev}
              className="rounded-full p-2 text-white/65 transition hover:bg-white/8 hover:text-white"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-[1.03]"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              onClick={onNext}
              className="rounded-full p-2 text-white/65 transition hover:bg-white/8 hover:text-white"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              onClick={onToggleRepeat}
              className={`rounded-full p-2 transition ${
                repeatMode !== "none" ? "text-[#1db954]" : "text-white/55 hover:text-white"
              }`}
            >
              {repeatMode === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          <div className="flex w-full items-center gap-3">
            <span className="w-10 text-right text-[11px] text-white/45">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress || 0}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #1db954 ${
                  (progress || 0) * 100
                }%, rgba(255,255,255,0.12) ${(progress || 0) * 100}%)`,
              }}
            />
            <span className="w-10 text-[11px] text-white/45">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onOpenLyrics}
            className={`rounded-full p-2 transition ${
              rightTab === "lyrics" ? "text-[#1db954]" : "text-white/55 hover:text-white"
            }`}
          >
            <Mic2 size={16} />
          </button>
          <button
            onClick={onOpenQueue}
            className={`rounded-full p-2 transition ${
              rightTab === "queue" ? "text-[#1db954]" : "text-white/55 hover:text-white"
            }`}
          >
            <ListMusic size={16} />
          </button>
          <span className="text-xs text-white/45">{queueCount} queued</span>
          <button
            onClick={onToggleMute}
            className="rounded-full p-2 text-white/60 transition hover:text-white"
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(event) => onSetVolume(Number(event.target.value))}
            className="w-28"
            style={{
              background: `linear-gradient(to right, #1db954 ${
                (isMuted ? 0 : volume) * 100
              }%, rgba(255,255,255,0.12) ${(isMuted ? 0 : volume) * 100}%)`,
            }}
          />
        </div>
      </div>
    </footer>
  );
}

function MobilePlayerOverlay({
  open,
  track,
  isPlaying,
  isLoading,
  progress,
  duration,
  currentTime,
  isLiked,
  lyrics,
  activeTab,
  queue,
  onClose,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onLike,
  onAdd,
  onSetTab,
}) {
  if (!open || !track) return null;

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-[linear-gradient(180deg,#3a261f_0%,#151515_40%,#050505_100%)] text-white md:hidden">
      <div className="flex items-center justify-between px-4 pt-5">
        <button onClick={onClose} className="rounded-full p-2 text-white/70">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/50">
            Playing from Melodix
          </p>
          <p className="mt-1 text-sm font-semibold">{track.album || "Single"}</p>
        </div>
        <button className="rounded-full p-2 text-white/70">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="px-5 pt-6">
        <img
          src={track.thumbnail || FALLBACK_ART}
          alt=""
          className="aspect-square w-full rounded-[32px] object-cover shadow-[0_32px_80px_rgba(0,0,0,0.45)]"
        />
        <div className="mt-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-3xl font-black">{track.name || track.title}</p>
            <p className="mt-1 truncate text-base text-white/65">{track.artist}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLike} className={isLiked ? "text-[#1db954]" : "text-white/55"}>
              <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button onClick={onAdd} className="text-white/65">
              <CirclePlus size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress || 0}
          onChange={(event) => onSeek(Number(event.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, #ffffff ${(progress || 0) * 100}%, rgba(255,255,255,0.18) ${(progress || 0) * 100}%)`,
          }}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-white/55">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-5 pt-5">
        <button onClick={onPrev} className="text-white/80">
          <SkipBack size={24} fill="currentColor" />
        </button>
        <button
          onClick={onTogglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black"
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={26} fill="currentColor" />
          ) : (
            <Play size={26} fill="currentColor" className="ml-1" />
          )}
        </button>
        <button onClick={onNext} className="text-white/80">
          <SkipForward size={24} fill="currentColor" />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 px-5">
        {["lyrics", "queue", "info"].map((tab) => (
          <button
            key={tab}
            onClick={() => onSetTab(tab)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
              activeTab === tab ? "bg-white text-black" : "bg-white/10 text-white/65"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-5 pb-8">
        {activeTab === "queue" ? (
          <div className="space-y-3">
            {queue.length ? (
              queue.map((song, index) => (
                <div
                  key={`${song.youtubeId}-${index}`}
                  className="flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-2"
                >
                  <img
                    src={song.thumbnail || FALLBACK_ART}
                    alt=""
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{song.name || song.title}</p>
                    <p className="truncate text-xs text-white/55">{song.artist}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="pt-10 text-center text-sm text-white/55">Queue will appear here.</p>
            )}
          </div>
        ) : activeTab === "info" ? (
          <div className="space-y-4 rounded-[28px] bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Track info</p>
            <div>
              <p className="text-sm text-white/55">Album</p>
              <p className="mt-1 text-lg font-semibold">{track.album || "Single"}</p>
            </div>
            <div>
              <p className="text-sm text-white/55">Duration</p>
              <p className="mt-1 text-lg font-semibold">{track.duration || "--:--"}</p>
            </div>
            <div>
              <p className="text-sm text-white/55">Artists</p>
              <p className="mt-1 text-lg font-semibold">{track.artist}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {lyrics.map((line) => {
              const isActive =
                progress >= line.progressStart && progress <= line.progressEnd;
              return (
                <p
                  key={line.id}
                  className={`text-2xl font-black leading-[1.3] transition ${
                    isActive ? "text-white" : "text-white/28"
                  }`}
                >
                  {line.text}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, actionLabel = "Show all", onAction }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <button
        onClick={onAction}
        className="text-sm font-semibold text-white/55 transition hover:text-white"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function MixCard({ item, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[92px] items-stretch overflow-hidden rounded-[20px] bg-white/6 text-left transition hover:bg-white/10"
    >
      <img src={item.image} alt="" className="h-[92px] w-[92px] object-cover" />
      <div className="flex min-w-0 flex-1 items-center px-4">
        <p className="line-clamp-2 text-sm font-bold text-white">{item.title}</p>
      </div>
    </button>
  );
}

function SquareCard({ item, subtitle, onClick, onSecondary }) {
  return (
    <div className="group rounded-[26px] bg-[#151515] p-3 transition hover:bg-[#1a1a1a]">
      <button onClick={onClick} className="w-full text-left">
        <div className="relative overflow-hidden rounded-[22px]">
          <img src={item.image} alt="" className="aspect-square w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
        <p className="mt-3 line-clamp-1 text-base font-bold text-white">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-white/50">{subtitle}</p>
      </button>
      {onSecondary ? (
        <button
          onClick={onSecondary}
          className="mt-3 rounded-full bg-white/6 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Add to playlist
        </button>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const { showToast } = useToast();
  const {
    playSong,
    currentSong,
    isPlaying,
    isShuffle,
    repeatMode,
    progress,
    duration,
    currentTime,
    volume,
    isMuted,
    isLoading,
    upcomingQueue,
    togglePlay,
    nextSong,
    prevSong,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [desktopFilter, setDesktopFilter] = useState("All");
  const [mobileTab, setMobileTab] = useState("home");
  const [rightTab, setRightTab] = useState("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [homeFeed, setHomeFeed] = useState(null);
  const [profile, setProfile] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [isPlayerOpenMobile, setIsPlayerOpenMobile] = useState(false);
  const [mobileOverlayTab, setMobileOverlayTab] = useState("lyrics");
  const [playlistModal, setPlaylistModal] = useState({ open: false, mode: "create" });
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState(null);
  const [addingTrack, setAddingTrack] = useState(false);
  const [viewHistory, setViewHistory] = useState([{ view: "home" }]);
  const [viewHistoryIndex, setViewHistoryIndex] = useState(0);

  const loadApp = async () => {
    setLoading(true);
    try {
      const [authData, profileData, homeData, playlistsData, likesData, recentData] =
        await Promise.all([
          getCurrentUser(),
          getProfile(),
          getLibraryHome(),
          getPlaylists(),
          getLikedSongs(),
          getRecentPlays(),
        ]);

      setUser(authData.user || authData);
      setProfile(profileData.profile || profileData);
      setHomeFeed(homeData);
      setPlaylists(playlistsData || []);
      setLikedSongs(likesData.likedSongs || likesData || []);
      setRecentPlays(recentData.recentlyPlayed || recentData || []);
    } catch (error) {
      showToast(error.message || "Failed to load Melodix", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApp();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchYouTube(searchQuery.trim());
        setSearchResults((data || []).map(normalizeTrack));
      } catch (error) {
        setSearchResults([]);
        showToast(error.message || "Search failed", "error");
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const allTracks = useMemo(
    () =>
      dedupeTracks(
        collectTracks(
          likedSongs,
          recentPlays.map((entry) => entry.track || entry),
          playlists,
          searchResults,
          homeFeed?.madeForYou,
          homeFeed?.trending
        )
      ),
    [likedSongs, recentPlays, playlists, searchResults, homeFeed]
  );

  const artistCards = useMemo(() => {
    const map = new Map();
    allTracks.forEach((track) => {
      const key = track.artist || "Unknown artist";
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: key,
          image: track.thumbnail || FALLBACK_ART,
          tracks: [],
        });
      }
      map.get(key).tracks.push(track);
    });
    return Array.from(map.values())
      .map((artist) => ({
        ...artist,
        subtitle: `${artist.tracks.length} tracks`,
      }))
      .sort((left, right) => right.tracks.length - left.tracks.length);
  }, [allTracks]);

  const albumCards = useMemo(() => {
    const map = new Map();
    allTracks.forEach((track) => {
      const key = track.album || "Single";
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: key,
          image: track.thumbnail || FALLBACK_ART,
          tracks: [],
          artist: track.artist,
        });
      }
      map.get(key).tracks.push(track);
    });
    return Array.from(map.values())
      .map((album) => ({
        ...album,
        subtitle: `${album.artist} • ${album.tracks.length} songs`,
      }))
      .sort((left, right) => right.tracks.length - left.tracks.length);
  }, [allTracks]);

  const blendCards = useMemo(() => {
    const playlistCards = playlists.slice(0, 6).map((playlist) => ({
      id: playlist._id,
      title: playlist.name,
      image: playlistArt(playlist),
      type: "playlist",
    }));
    const likedCard = {
      id: "liked",
      title: "Liked Songs",
      image: likedSongs[0]?.thumbnail || FALLBACK_ART,
      type: "liked",
    };
    return [likedCard, ...playlistCards].slice(0, 6);
  }, [playlists, likedSongs]);

  const mixCards = useMemo(() => {
    const base = (homeFeed?.madeForYou || []).map((item, index) => ({
      id: item._id || `mix-${index}`,
      title: item.name || item.title || `Daily Mix ${index + 1}`,
      image: item.coverImage || item.thumbnail || FALLBACK_ART,
      songs: (item.songs || []).map(normalizeTrack),
      subtitle:
        item.description ||
        dedupeTracks(item.songs || [])
          .slice(0, 3)
          .map((song) => song.artist)
          .join(", "),
    }));

    if (base.length) return base.slice(0, 5);

    return albumCards.slice(0, 5).map((album, index) => ({
      id: album.id,
      title: `Daily Mix ${String(index + 1).padStart(2, "0")}`,
      image: album.image,
      songs: album.tracks,
      subtitle: album.subtitle,
    }));
  }, [homeFeed, albumCards]);

  const heroRelease = useMemo(() => {
    const firstArtist = artistCards[0];
    const firstTrack = firstArtist?.tracks?.[0] || likedSongs[0] || allTracks[0];
    return {
      title: firstArtist?.title || "Your next obsession",
      subtitle: firstTrack?.album || "Single",
      image: firstTrack?.thumbnail || FALLBACK_ART,
      description: firstTrack?.name || "Start the session",
      track: firstTrack,
    };
  }, [artistCards, likedSongs, allTracks]);

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist._id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId]
  );

  const selectedArtistCard = useMemo(
    () => artistCards.find((artist) => artist.id === selectedArtist) || null,
    [artistCards, selectedArtist]
  );

  const selectedAlbumCard = useMemo(
    () => albumCards.find((album) => album.id === selectedAlbum) || null,
    [albumCards, selectedAlbum]
  );

  const currentLyrics = useMemo(
    () => buildLyrics(currentSong || heroRelease.track),
    [currentSong, heroRelease]
  );

  const likedIds = useMemo(
    () => new Set(likedSongs.map((track) => track.youtubeId || track.videoId)),
    [likedSongs]
  );

  const pushView = (view, extras = {}) => {
    const nextEntry = { view, ...extras };
    const trimmed = viewHistory.slice(0, viewHistoryIndex + 1);
    setViewHistory([...trimmed, nextEntry]);
    setViewHistoryIndex(trimmed.length);
    setActiveView(view);
    if (view === "search") setMobileTab("search");
    if (view === "library" || view === "playlist") setMobileTab("library");
    if (view === "profile") setMobileTab("profile");
    if (view === "home") setMobileTab("home");
    if (extras.playlistId) setSelectedPlaylistId(extras.playlistId);
    if (extras.artistId) setSelectedArtist(extras.artistId);
    if (extras.albumId) setSelectedAlbum(extras.albumId);
  };

  const restoreView = (entry) => {
    setActiveView(entry.view);
    setSelectedPlaylistId(entry.playlistId || null);
    setSelectedArtist(entry.artistId || null);
    setSelectedAlbum(entry.albumId || null);
  };

  const goBack = () => {
    if (viewHistoryIndex === 0) return;
    const nextIndex = viewHistoryIndex - 1;
    setViewHistoryIndex(nextIndex);
    restoreView(viewHistory[nextIndex]);
  };

  const goForward = () => {
    if (viewHistoryIndex >= viewHistory.length - 1) return;
    const nextIndex = viewHistoryIndex + 1;
    setViewHistoryIndex(nextIndex);
    restoreView(viewHistory[nextIndex]);
  };

  const rememberPlay = async (track, contextType = "track", contextId = null) => {
    const normalized = normalizeTrack(track);
    const entry = {
      track: normalized,
      playedAt: new Date().toISOString(),
      contextType,
      contextId,
    };
    setRecentPlays((prev) =>
      [
        entry,
        ...prev.filter(
          (item) =>
            (item.track?.youtubeId || item.track?.videoId) !== normalized.youtubeId
        ),
      ].slice(0, 18)
    );
    try {
      await addRecentPlay({
        track: normalized,
        contextType,
        contextId,
      });
    } catch {
      // keep local state even if backend save fails
    }
  };

  const playTrack = (
    track,
    providedQueue = null,
    index = 0,
    contextType = "track",
    contextId = null
  ) => {
    const nextTrack = normalizeTrack(track);
    const nextQueue = providedQueue ? providedQueue.map(normalizeTrack) : [nextTrack];
    const safeIndex = Math.max(0, Math.min(index, nextQueue.length - 1));
    playSong(nextQueue[safeIndex], nextQueue, safeIndex);
    rememberPlay(nextQueue[safeIndex], contextType, contextId);
  };

  const playCollection = (items, contextType, contextId) => {
    const songs = dedupeTracks(collectTracks(items));
    if (!songs.length) {
      showToast("Nothing to play here yet", "info");
      return;
    }
    playTrack(songs[0], songs, 0, contextType, contextId);
  };

  const handleLike = async (track) => {
    const normalized = normalizeTrack(track);
    try {
      const response = await toggleLikeSong(normalized);
      setLikedSongs(response.likedSongs || []);
      showToast(
        response.isLiked ? "Added to liked songs" : "Removed from liked songs",
        "success"
      );
    } catch (error) {
      showToast(error.message || "Could not update liked songs", "error");
    }
  };

  const handleCreatePlaylist = async (name) => {
    setSavingPlaylist(true);
    try {
      const playlist = await createPlaylist(name);
      setPlaylists((prev) => [playlist, ...prev]);
      setPlaylistModal({ open: false, mode: "create" });
      pushView("playlist", { playlistId: playlist._id });
      showToast("Playlist created", "success");
    } catch (error) {
      showToast(error.message || "Failed to create playlist", "error");
    } finally {
      setSavingPlaylist(false);
    }
  };

  const handleRenamePlaylist = async (name) => {
    if (!selectedPlaylist) return;
    setSavingPlaylist(true);
    try {
      const updatedPlaylist = await updatePlaylist(selectedPlaylist._id, name);
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist._id === selectedPlaylist._id ? updatedPlaylist : playlist
        )
      );
      setPlaylistModal({ open: false, mode: "rename" });
      showToast("Playlist renamed", "success");
    } catch (error) {
      showToast(error.message || "Failed to rename playlist", "error");
    } finally {
      setSavingPlaylist(false);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    try {
      await deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((playlist) => playlist._id !== playlistId));
      if (selectedPlaylistId === playlistId) {
        setSelectedPlaylistId(null);
        pushView("library");
      }
      showToast("Playlist deleted", "success");
    } catch (error) {
      showToast(error.message || "Failed to delete playlist", "error");
    }
  };

  const handleAddTrackToPlaylist = async (playlist) => {
    if (!trackToAdd) return;
    setAddingTrack(true);
    try {
      const updatedPlaylist = await addSongFromYouTube(
        playlist._id,
        normalizeTrack(trackToAdd)
      );
      setPlaylists((prev) =>
        prev.map((item) => (item._id === playlist._id ? updatedPlaylist : item))
      );
      setTrackToAdd(null);
      showToast(`Added to ${playlist.name}`, "success");
    } catch (error) {
      showToast(error.message || "Could not add track", "error");
    } finally {
      setAddingTrack(false);
    }
  };

  const handleSaveProfile = async (payload) => {
    setSavingProfile(true);
    try {
      const response = await updateProfile(payload);
      setProfile(response.profile || response);
      setProfileModalOpen(false);
      showToast("Profile updated", "success");
    } catch (error) {
      showToast(error.message || "Failed to save profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const openPlaylist = (playlistId) => {
    setSelectedPlaylistId(playlistId);
    pushView("playlist", { playlistId });
  };

  const openArtist = (artistId) => {
    setSelectedArtist(artistId);
    pushView("artist", { artistId });
  };

  const openAlbum = (albumId) => {
    setSelectedAlbum(albumId);
    pushView("album", { albumId });
  };

  const searchTracks = searchResults;

  const desktopMainContent = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 size={30} className="animate-spin text-white/70" />
        </div>
      );
    }

    if (activeView === "search") {
      return (
        <div className="space-y-8">
          <SectionHeader
            title={searchQuery ? `Results for "${searchQuery}"` : "Search"}
            actionLabel={isSearching ? "Searching..." : "Live results"}
            onAction={() => setSearchQuery("")}
          />
          {!searchQuery ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Pop", color: "from-pink-500 to-rose-700" },
                { title: "Lofi", color: "from-orange-500 to-amber-700" },
                { title: "Anime", color: "from-sky-500 to-indigo-700" },
                { title: "Focus", color: "from-emerald-500 to-green-700" },
              ].map((genre) => (
                <button
                  key={genre.title}
                  onClick={() => setSearchQuery(genre.title)}
                  className={`h-32 rounded-[28px] bg-gradient-to-br ${genre.color} p-5 text-left text-2xl font-black text-white`}
                >
                  {genre.title}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {searchTracks.map((track, index) => (
                <div
                  key={`${track.youtubeId}-${index}`}
                  className="rounded-[28px] bg-[#151515] p-4 transition hover:bg-[#1a1a1a]"
                >
                  <button
                    onClick={() => playTrack(track, searchTracks, index, "search", searchQuery)}
                    className="flex w-full items-center gap-4 text-left"
                  >
                    <img
                      src={track.thumbnail || FALLBACK_ART}
                      alt=""
                      className="h-20 w-20 rounded-[20px] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-white">
                        {track.name || track.title}
                      </p>
                      <p className="truncate text-sm text-white/55">{track.artist}</p>
                      <p className="mt-1 text-xs text-white/35">{track.duration}</p>
                    </div>
                  </button>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => playTrack(track, searchTracks, index, "search", searchQuery)}
                      className="rounded-full bg-[#1db954] px-4 py-2 text-xs font-bold text-black"
                    >
                      Play now
                    </button>
                    <button
                      onClick={() => handleLike(track)}
                      className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/75"
                    >
                      {likedIds.has(track.youtubeId) ? "Unlike" : "Like"}
                    </button>
                    <button
                      onClick={() => setTrackToAdd(track)}
                      className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/75"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeView === "playlist" && selectedPlaylist) {
      const playlistTracks = (selectedPlaylist.songs || []).map(normalizeTrack);
      return (
        <div className="space-y-8">
          <div className="rounded-[34px] bg-gradient-to-br from-[#30245a] via-[#191919] to-[#111111] p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end">
              <img
                src={playlistArt(selectedPlaylist)}
                alt=""
                className="h-48 w-48 rounded-[28px] object-cover shadow-[0_28px_60px_rgba(0,0,0,0.35)]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Playlist</p>
                <h1 className="mt-3 text-4xl font-black text-white xl:text-6xl">
                  {selectedPlaylist.name}
                </h1>
                <p className="mt-4 max-w-3xl text-sm text-white/60">
                  {selectedPlaylist.description || "Your collection, updated inside Melodix."}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      playCollection(playlistTracks, "playlist", selectedPlaylist._id)
                    }
                    className="rounded-full bg-[#1db954] px-6 py-3 text-sm font-black text-black"
                  >
                    Play
                  </button>
                  <button
                    onClick={() =>
                      setPlaylistModal({
                        open: true,
                        mode: "rename",
                        initialName: selectedPlaylist.name,
                      })
                    }
                    className="rounded-full bg-white/8 px-5 py-3 text-sm font-semibold text-white/80"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeletePlaylist(selectedPlaylist._id)}
                    className="rounded-full bg-white/8 px-5 py-3 text-sm font-semibold text-white/80"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {playlistTracks.length ? (
              playlistTracks.map((track, index) => (
                <div
                  key={`${track.youtubeId}-${index}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[24px] bg-white/4 px-4 py-3"
                >
                  <button
                    onClick={() =>
                      playTrack(track, playlistTracks, index, "playlist", selectedPlaylist._id)
                    }
                    className="flex items-center gap-4 text-left"
                  >
                    <img
                      src={track.thumbnail || FALLBACK_ART}
                      alt=""
                      className="h-16 w-16 rounded-[18px] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-white">{track.name}</p>
                      <p className="truncate text-sm text-white/55">{track.artist}</p>
                    </div>
                  </button>
                  <p className="justify-self-end text-sm text-white/45">{track.duration}</p>
                  <button
                    onClick={() => handleLike(track)}
                    className={likedIds.has(track.youtubeId) ? "text-[#1db954]" : "text-white/55"}
                  >
                    <Heart size={18} fill={likedIds.has(track.youtubeId) ? "currentColor" : "none"} />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 px-6 py-12 text-center text-white/55">
                This playlist is empty. Use search and add some tracks.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeView === "artist" && selectedArtistCard) {
      return (
        <div className="space-y-8">
          <div className="rounded-[34px] bg-gradient-to-b from-[#233450] to-[#111111] p-8">
            <div className="flex items-end gap-6">
              <img
                src={selectedArtistCard.image}
                alt=""
                className="h-40 w-40 rounded-full object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Artist</p>
                <h1 className="mt-2 text-5xl font-black text-white">{selectedArtistCard.title}</h1>
                <p className="mt-2 text-sm text-white/55">
                  {selectedArtistCard.tracks.length} tracks in your universe
                </p>
              </div>
            </div>
          </div>
          <SectionHeader
            title="Top tracks"
            actionLabel="Play artist"
            onAction={() =>
              playCollection(selectedArtistCard.tracks, "artist", selectedArtistCard.id)
            }
          />
          <div className="space-y-3">
            {selectedArtistCard.tracks.map((track, index) => (
              <div
                key={`${track.youtubeId}-${index}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[24px] bg-white/4 px-4 py-3"
              >
                <button
                  onClick={() =>
                    playTrack(track, selectedArtistCard.tracks, index, "artist", selectedArtistCard.id)
                  }
                  className="flex items-center gap-4 text-left"
                >
                  <img
                    src={track.thumbnail || FALLBACK_ART}
                    alt=""
                    className="h-16 w-16 rounded-[18px] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">{track.name}</p>
                    <p className="truncate text-sm text-white/55">{track.album}</p>
                  </div>
                </button>
                <button
                  onClick={() => openAlbum(track.album)}
                  className="justify-self-start rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/70"
                >
                  Open album
                </button>
                <button
                  onClick={() => handleLike(track)}
                  className={likedIds.has(track.youtubeId) ? "text-[#1db954]" : "text-white/55"}
                >
                  <Heart size={18} fill={likedIds.has(track.youtubeId) ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeView === "album" && selectedAlbumCard) {
      return (
        <div className="space-y-8">
          <div className="rounded-[34px] bg-gradient-to-b from-[#4d2418] to-[#111111] p-8">
            <div className="flex items-end gap-6">
              <img
                src={selectedAlbumCard.image}
                alt=""
                className="h-40 w-40 rounded-[28px] object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Album</p>
                <h1 className="mt-2 text-5xl font-black text-white">{selectedAlbumCard.title}</h1>
                <p className="mt-2 text-sm text-white/55">{selectedAlbumCard.subtitle}</p>
              </div>
            </div>
          </div>
          <SectionHeader
            title="Tracklist"
            actionLabel="Play album"
            onAction={() => playCollection(selectedAlbumCard.tracks, "album", selectedAlbumCard.id)}
          />
          <div className="space-y-3">
            {selectedAlbumCard.tracks.map((track, index) => (
              <div
                key={`${track.youtubeId}-${index}`}
                className="flex items-center justify-between gap-4 rounded-[24px] bg-white/4 px-4 py-3"
              >
                <button
                  onClick={() =>
                    playTrack(track, selectedAlbumCard.tracks, index, "album", selectedAlbumCard.id)
                  }
                  className="flex min-w-0 items-center gap-4 text-left"
                >
                  <img
                    src={track.thumbnail || FALLBACK_ART}
                    alt=""
                    className="h-16 w-16 rounded-[18px] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">{track.name}</p>
                    <p className="truncate text-sm text-white/55">{track.artist}</p>
                  </div>
                </button>
                <p className="text-sm text-white/45">{track.duration}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeView === "liked") {
      return (
        <div className="space-y-8">
          <div className="rounded-[34px] bg-gradient-to-br from-[#4d2ac8] to-[#161616] p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Playlist</p>
            <h1 className="mt-3 text-5xl font-black text-white">Liked Songs</h1>
            <p className="mt-3 text-sm text-white/60">
              {likedSongs.length} tracks saved in your library.
            </p>
            <button
              onClick={() => playCollection(likedSongs, "liked", "liked")}
              className="mt-6 rounded-full bg-[#1db954] px-6 py-3 text-sm font-black text-black"
            >
              Play liked songs
            </button>
          </div>
          <div className="space-y-3">
            {likedSongs.map((track, index) => (
              <div
                key={`${track.youtubeId}-${index}`}
                className="flex items-center justify-between gap-4 rounded-[24px] bg-white/4 px-4 py-3"
              >
                <button
                  onClick={() => playTrack(track, likedSongs, index, "liked", "liked")}
                  className="flex min-w-0 items-center gap-4 text-left"
                >
                  <img
                    src={track.thumbnail || FALLBACK_ART}
                    alt=""
                    className="h-16 w-16 rounded-[18px] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">{track.name}</p>
                    <p className="truncate text-sm text-white/55">{track.artist}</p>
                  </div>
                </button>
                <button onClick={() => handleLike(track)} className="text-[#1db954]">
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeView === "recent") {
      return (
        <div className="space-y-8">
          <SectionHeader title="Recently played" actionLabel="Refresh" onAction={loadApp} />
          <div className="space-y-3">
            {recentPlays.map((entry, index) => {
              const track = normalizeTrack(entry.track || entry);
              return (
                <div
                  key={`${track.youtubeId}-${index}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[24px] bg-white/4 px-4 py-3"
                >
                  <button
                    onClick={() =>
                      playTrack(track, recentPlays.map((item) => item.track || item), index, "recent", "recent")
                    }
                    className="flex items-center gap-4 text-left"
                  >
                    <img
                      src={track.thumbnail || FALLBACK_ART}
                      alt=""
                      className="h-16 w-16 rounded-[18px] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-white">{track.name}</p>
                      <p className="truncate text-sm text-white/55">{track.artist}</p>
                    </div>
                  </button>
                  <p className="text-sm text-white/45">{relativeDate(entry.playedAt)}</p>
                  <button
                    onClick={() => setTrackToAdd(track)}
                    className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/70"
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeView === "profile") {
      return (
        <div className="space-y-8">
          <div className="rounded-[34px] bg-gradient-to-br from-[#1a2838] via-[#111111] to-[#111111] p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
              <div
                className="flex h-36 w-36 items-center justify-center rounded-full text-5xl font-black text-white"
                style={{ background: profile?.avatarColor || "#3b82f6" }}
              >
                {(profile?.name || user?.name || "M")[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Profile</p>
                <h1 className="mt-2 text-5xl font-black text-white">
                  {profile?.name || user?.name || "Melodix listener"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-white/60">
                  {profile?.bio || "Build your own fully fledged streaming vibe."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(profile?.favoriteGenres || ["pop", "lofi", "alt"]).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(true)}
                className="rounded-full bg-[#1db954] px-6 py-3 text-sm font-black text-black"
              >
                Edit profile
              </button>
            </div>
          </div>
          <SectionHeader title="Your favorite artists" actionLabel="View library" onAction={() => pushView("library")} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {artistCards.slice(0, 4).map((artist) => (
              <SquareCard
                key={artist.id}
                item={artist}
                subtitle={artist.subtitle}
                onClick={() => openArtist(artist.id)}
              />
            ))}
          </div>
        </div>
      );
    }

    if (activeView === "library") {
      return (
        <div className="space-y-8">
          <SectionHeader title="Your library" actionLabel="New playlist" onAction={() => setPlaylistModal({ open: true, mode: "create" })} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {playlists.map((playlist) => (
              <SquareCard
                key={playlist._id}
                item={{ title: playlist.name, image: playlistArt(playlist) }}
                subtitle={`${playlist.songs?.length || 0} tracks`}
                onClick={() => openPlaylist(playlist._id)}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-10">
        <div className="rounded-[34px] bg-[linear-gradient(180deg,#3f2a72_0%,#171717_54%,#121212_100%)] p-6 xl:p-8">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {blendCards.map((item) => (
              <MixCard
                key={item.id}
                item={item}
                onClick={() => {
                  if (item.type === "liked") pushView("liked");
                  else openPlaylist(item.id);
                }}
              />
            ))}
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="rounded-[28px] bg-white/4 p-4">
              <p className="text-sm text-white/50">New release from</p>
              <h2 className="mt-1 text-4xl font-black text-white">{heroRelease.title}</h2>
              <div className="mt-5 overflow-hidden rounded-[24px]">
                <img
                  src={heroRelease.image}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              </div>
              <p className="mt-4 text-sm text-white/60">{heroRelease.subtitle}</p>
              <p className="mt-1 text-3xl font-black text-white">{heroRelease.description}</p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() =>
                    heroRelease.track &&
                    playTrack(heroRelease.track, [heroRelease.track], 0, "release", heroRelease.title)
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black"
                >
                  <Play size={18} fill="currentColor" />
                </button>
                <button
                  onClick={() => heroRelease.track && setTrackToAdd(heroRelease.track)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70"
                >
                  <CirclePlus size={18} />
                </button>
              </div>
            </div>

            <div>
              <SectionHeader
                title={`Made for ${profile?.name || user?.name || "you"}`}
                onAction={() => pushView("library")}
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {mixCards.map((mix) => (
                  <SquareCard
                    key={mix.id}
                    item={mix}
                    subtitle={mix.subtitle}
                    onClick={() => playCollection(mix.songs, "mix", mix.id)}
                    onSecondary={() => mix.songs?.[0] && setTrackToAdd(mix.songs[0])}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <SectionHeader title="Recents" onAction={() => pushView("recent")} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {recentPlays.slice(0, 6).map((entry, index) => {
              const track = normalizeTrack(entry.track || entry);
              return (
                <SquareCard
                  key={`${track.youtubeId}-${index}`}
                  item={{ title: track.name, image: track.thumbnail }}
                  subtitle={track.artist}
                  onClick={() =>
                    playTrack(track, recentPlays.map((item) => item.track || item), index, "recent", "recent")
                  }
                />
              );
            })}
          </div>
        </div>

        <div>
          <SectionHeader title="Artists you keep coming back to" actionLabel="Browse artists" onAction={() => pushView("library")} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {artistCards.slice(0, 5).map((artist) => (
              <SquareCard
                key={artist.id}
                item={artist}
                subtitle={artist.subtitle}
                onClick={() => openArtist(artist.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const rightPanelTracks =
    rightTab === "recent"
      ? recentPlays.map((entry) => normalizeTrack(entry.track || entry))
      : rightTab === "queue"
      ? upcomingQueue
      : [];

  return (
    <div className="flex h-full w-full flex-col bg-black text-white">
      <div className="hidden h-[72px] shrink-0 items-center justify-between gap-4 border-b border-white/6 bg-black px-5 md:flex">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={viewHistoryIndex === 0}
            className="rounded-full bg-white/6 p-2 text-white/70 disabled:opacity-35"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goForward}
            disabled={viewHistoryIndex >= viewHistory.length - 1}
            className="rounded-full bg-white/6 p-2 text-white/70 disabled:opacity-35"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => pushView("home")}
            className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <Home size={18} />
          </button>
        </div>

        <div className="flex w-full max-w-[620px] items-center gap-3 rounded-full bg-white/8 px-4 py-3">
          <Search size={18} className="text-white/55" />
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              pushView("search");
            }}
            placeholder="What do you want to play?"
            className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/40"
          />
          <button
            onClick={() => pushView("search")}
            className="rounded-full bg-white/6 px-3 py-1 text-xs font-semibold text-white/70"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-2">
          {[
            { icon: MonitorUp, label: "Desktop mode" },
            { icon: Maximize2, label: "Expand view" },
            { icon: Bell, label: "Notifications" },
            { icon: Sparkles, label: "Enhance mix" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => showToast(`${item.label} is ready`, "info")}
              className="rounded-full p-2 text-white/65 transition hover:bg-white/8 hover:text-white"
            >
              <item.icon size={18} />
            </button>
          ))}
          <button
            onClick={() => pushView("profile")}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#60a5fa] text-sm font-black text-black"
          >
            {(profile?.name || user?.name || "S")[0]?.toUpperCase()}
          </button>
        </div>
      </div>
      <div className="hidden min-h-0 flex-1 gap-2 px-2 py-2 md:flex">
        <aside className="flex w-[68px] flex-col items-center gap-3 rounded-[24px] bg-[#111111] py-4">
          <img src={logo} alt="Melodix" className="h-7 w-7 rounded-lg object-contain" />
          {[
            { icon: Library, label: "Library", action: () => setIsLibraryExpanded((value) => !value) },
            { icon: Plus, label: "Create", action: () => setPlaylistModal({ open: true, mode: "create" }) },
            { icon: Heart, label: "Liked", action: () => pushView("liked") },
            { icon: Bookmark, label: "Recent", action: () => pushView("recent") },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-white/75 transition hover:bg-white/12 hover:text-white"
            >
              <item.icon size={18} />
            </button>
          ))}
          <div className="mt-2 flex flex-1 flex-col items-center gap-3 overflow-hidden">
            {artistCards.slice(0, 8).map((artist) => (
              <button key={artist.id} onClick={() => openArtist(artist.id)}>
                <img
                  src={artist.image}
                  alt={artist.title}
                  className="h-11 w-11 rounded-2xl object-cover"
                />
              </button>
            ))}
          </div>
        </aside>

        {isLibraryExpanded ? (
          <aside className="flex w-[300px] shrink-0 flex-col rounded-[24px] bg-[#111111] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Your Library</h2>
                <p className="mt-1 text-xs text-white/45">Playlists, artists, and saved vibes</p>
              </div>
              <button
                onClick={() => setPlaylistModal({ open: true, mode: "create" })}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white"
              >
                Create
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              {["Playlists", "Artists", "Albums"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === "Artists") pushView("profile");
                    else pushView("library");
                  }}
                  className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/70"
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
              <button
                onClick={() => pushView("liked")}
                className="flex w-full items-center gap-3 rounded-[20px] px-3 py-2 text-left transition hover:bg-white/6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#5927f2] to-[#98d8ff]">
                  <Heart size={20} fill="white" color="white" />
                </div>
                <div>
                  <p className="font-semibold text-[#1ed760]">Liked Songs</p>
                  <p className="text-xs text-white/45">Playlist • {likedSongs.length} songs</p>
                </div>
              </button>

              {playlists.map((playlist) => (
                <button
                  key={playlist._id}
                  onClick={() => openPlaylist(playlist._id)}
                  className="flex w-full items-center gap-3 rounded-[20px] px-3 py-2 text-left transition hover:bg-white/6"
                >
                  <img
                    src={playlistArt(playlist)}
                    alt=""
                    className="h-12 w-12 rounded-[16px] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{playlist.name}</p>
                    <p className="truncate text-xs text-white/45">
                      Playlist • {playlist.songs?.length || 0} tracks
                    </p>
                  </div>
                </button>
              ))}

              {artistCards.slice(0, 8).map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => openArtist(artist.id)}
                  className="flex w-full items-center gap-3 rounded-[20px] px-3 py-2 text-left transition hover:bg-white/6"
                >
                  <img
                    src={artist.image}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{artist.title}</p>
                    <p className="truncate text-xs text-white/45">Artist</p>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto rounded-[24px] bg-[#111111] p-6">
          <div className="mb-6 flex items-center gap-2">
            {DESKTOP_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setDesktopFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  desktopFilter === filter
                    ? "bg-white text-black"
                    : "bg-white/8 text-white/65 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          {desktopMainContent()}
        </main>

        <aside className="flex w-[304px] shrink-0 flex-col rounded-[24px] bg-[#111111] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              {RIGHT_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                    rightTab === tab
                      ? "bg-white text-black"
                      : "text-white/55 transition hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => setRightTab("queue")}
              className="rounded-full p-2 text-white/45 transition hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {rightTab === "info" && currentSong ? (
            <div className="space-y-5 overflow-y-auto">
              <div className="overflow-hidden rounded-[28px]">
                <img
                  src={currentSong.thumbnail || FALLBACK_ART}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{currentSong.name || currentSong.title}</p>
                <p className="mt-1 text-lg text-white/65">{currentSong.artist}</p>
              </div>
              <div className="rounded-[24px] bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">About the artist</p>
                <p className="mt-3 text-sm leading-6 text-white/68">
                  {currentSong.artist} is living inside your current Melodix rotation. Use the artist page to keep the session going.
                </p>
                <button
                  onClick={() => openArtist(currentSong.artist)}
                  className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                >
                  Open artist
                </button>
              </div>
            </div>
          ) : rightTab === "lyrics" ? (
            <div className="flex-1 overflow-y-auto rounded-[28px] bg-[#222b3a] px-8 py-10">
              {currentLyrics.map((line) => {
                const isActive = progress >= line.progressStart && progress <= line.progressEnd;
                return (
                  <p
                    key={line.id}
                    className={`mb-8 text-4xl font-black leading-[1.28] ${
                      isActive ? "text-white" : "text-white/28"
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {currentSong && rightTab !== "recent" ? (
                <div className="mb-5 rounded-[24px] bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">Now playing</p>
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={currentSong.thumbnail || FALLBACK_ART}
                      alt=""
                      className="h-14 w-14 rounded-[18px] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#1db954]">
                        {currentSong.name || currentSong.title}
                      </p>
                      <p className="truncate text-sm text-white/55">{currentSong.artist}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                {rightPanelTracks.length ? (
                  rightPanelTracks.map((track, index) => (
                    <button
                      key={`${track.youtubeId || track.videoId}-${index}`}
                      onClick={() =>
                        playTrack(
                          track,
                          rightTab === "recent" ? rightPanelTracks : [currentSong, ...rightPanelTracks].filter(Boolean),
                          rightTab === "recent" ? index : index + 1,
                          rightTab,
                          rightTab
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-[20px] px-2 py-2 text-left transition hover:bg-white/6"
                    >
                      <img
                        src={track.thumbnail || FALLBACK_ART}
                        alt=""
                        className="h-12 w-12 rounded-[16px] object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {track.name || track.title}
                        </p>
                        <p className="truncate text-xs text-white/45">{track.artist}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/45">
                    {rightTab === "queue"
                      ? "Queue is empty right now."
                      : "Recent plays will show up here."}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-black pb-[110px] md:hidden">
        <div className="px-4 pt-4">
          <div className="rounded-[30px] bg-[#111111] p-4">
            <div className="flex items-center justify-between">
              <img src={logo} alt="Melodix" className="h-10 object-contain" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => showToast("Notifications are working", "info")}
                  className="rounded-full bg-white/8 p-3 text-white/65"
                >
                  <Bell size={18} />
                </button>
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="rounded-full bg-white/8 p-3 text-white/65"
                >
                  <UserRound size={18} />
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-white/6 px-4 py-3">
              <div className="flex items-center gap-3">
                <Search size={18} className="text-white/45" />
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setMobileTab("search");
                    setActiveView("search");
                  }}
                  placeholder="What do you want to listen to?"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>
            </div>

            {mobileTab === "search" ? (
              <div className="mt-5 space-y-3">
                {searchQuery ? (
                  searchTracks.slice(0, 8).map((track, index) => (
                    <button
                      key={`${track.youtubeId}-${index}`}
                      onClick={() => playTrack(track, searchTracks, index, "search", searchQuery)}
                      className="flex w-full items-center gap-3 rounded-[20px] bg-white/5 p-3 text-left"
                    >
                      <img
                        src={track.thumbnail || FALLBACK_ART}
                        alt=""
                        className="h-14 w-14 rounded-[16px] object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{track.name}</p>
                        <p className="truncate text-xs text-white/45">{track.artist}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {["Pop", "Hip-Hop", "Anime", "Focus"].map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setSearchQuery(genre)}
                        className="rounded-[24px] bg-gradient-to-br from-[#343434] to-[#1b1b1b] p-4 text-left text-lg font-black"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : mobileTab === "library" ? (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">Your library</h2>
                  <button
                    onClick={() => setPlaylistModal({ open: true, mode: "create" })}
                    className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white/80"
                  >
                    Create
                  </button>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => pushView("liked")}
                    className="flex w-full items-center gap-3 rounded-[20px] bg-white/5 p-3 text-left"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#5927f2] to-[#98d8ff]">
                      <Heart size={20} fill="white" color="white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Liked Songs</p>
                      <p className="text-xs text-white/45">{likedSongs.length} songs</p>
                    </div>
                  </button>
                  {playlists.map((playlist) => (
                    <button
                      key={playlist._id}
                      onClick={() => openPlaylist(playlist._id)}
                      className="flex w-full items-center gap-3 rounded-[20px] bg-white/5 p-3 text-left"
                    >
                      <img
                        src={playlistArt(playlist)}
                        alt=""
                        className="h-14 w-14 rounded-[18px] object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{playlist.name}</p>
                        <p className="truncate text-xs text-white/45">
                          {playlist.songs?.length || 0} tracks
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : mobileTab === "profile" ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] bg-white/5 p-4">
                  <p className="text-sm text-white/45">Good afternoon</p>
                  <h2 className="mt-2 text-3xl font-black text-white">
                    {profile?.name || user?.name || "Melodix listener"}
                  </h2>
                  <p className="mt-2 text-sm text-white/55">
                    {profile?.bio || "Curating your own Spotify-style setup."}
                  </p>
                </div>
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="w-full rounded-[22px] bg-[#1db954] px-4 py-3 text-sm font-black text-black"
                >
                  Edit profile
                </button>
              </div>
            ) : activeView === "playlist" && selectedPlaylist ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[24px] bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">Playlist</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{selectedPlaylist.name}</h2>
                  <button
                    onClick={() => playCollection(selectedPlaylist.songs || [], "playlist", selectedPlaylist._id)}
                    className="mt-4 rounded-full bg-[#1db954] px-4 py-2 text-sm font-black text-black"
                  >
                    Play
                  </button>
                </div>
                {(selectedPlaylist.songs || []).map((track, index) => {
                  const song = normalizeTrack(track);
                  return (
                    <button
                      key={`${song.youtubeId}-${index}`}
                      onClick={() =>
                        playTrack(song, selectedPlaylist.songs || [], index, "playlist", selectedPlaylist._id)
                      }
                      className="flex w-full items-center gap-3 rounded-[20px] bg-white/5 p-3 text-left"
                    >
                      <img
                        src={song.thumbnail || FALLBACK_ART}
                        alt=""
                        className="h-14 w-14 rounded-[16px] object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{song.name}</p>
                        <p className="truncate text-xs text-white/45">{song.artist}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : activeView === "liked" ? (
              <div className="mt-5 space-y-3">
                {likedSongs.map((track, index) => (
                  <button
                    key={`${track.youtubeId}-${index}`}
                    onClick={() => playTrack(track, likedSongs, index, "liked", "liked")}
                    className="flex w-full items-center gap-3 rounded-[20px] bg-white/5 p-3 text-left"
                  >
                    <img
                      src={track.thumbnail || FALLBACK_ART}
                      alt=""
                      className="h-14 w-14 rounded-[16px] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{track.name}</p>
                      <p className="truncate text-xs text-white/45">{track.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                <div>
                  <div className="mb-3 flex gap-2">
                    {DESKTOP_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDesktopFilter(filter)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${
                          desktopFilter === filter
                            ? "bg-[#1db954] text-black"
                            : "bg-white/8 text-white/65"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {blendCards.map((item) => (
                      <MixCard
                        key={item.id}
                        item={item}
                        onClick={() => {
                          if (item.type === "liked") pushView("liked");
                          else openPlaylist(item.id);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionHeader title="Picked for you" actionLabel="Open library" onAction={() => setMobileTab("library")} />
                  <div className="grid grid-cols-2 gap-3">
                    {mixCards.slice(0, 4).map((mix) => (
                      <SquareCard
                        key={mix.id}
                        item={mix}
                        subtitle={mix.subtitle}
                        onClick={() => playCollection(mix.songs, "mix", mix.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentSong ? (
        <div className="fixed inset-x-3 bottom-[74px] z-40 rounded-[22px] bg-[linear-gradient(90deg,#0f766e,#065f46)] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.4)] md:hidden">
          <button
            onClick={() => setIsPlayerOpenMobile(true)}
            className="flex w-full items-center gap-3 text-left"
          >
            <img
              src={currentSong.thumbnail || FALLBACK_ART}
              alt=""
              className="h-12 w-12 rounded-[14px] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {currentSong.name || currentSong.title}
              </p>
              <p className="truncate text-xs text-white/75">{currentSong.artist}</p>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                togglePlay();
              }}
              className="rounded-full bg-white/90 p-3 text-black"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
          </button>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[74px] items-center justify-around border-t border-white/8 bg-[#090909]/95 backdrop-blur-md md:hidden">
        {MOBILE_TABS.map((tab) => {
          const Icon =
            tab === "home"
              ? Home
              : tab === "search"
              ? Search
              : tab === "library"
              ? Library
              : UserRound;
          return (
            <button
              key={tab}
              onClick={() => {
                setMobileTab(tab);
                setActiveView(tab === "library" ? "library" : tab);
              }}
              className={`flex flex-col items-center gap-1 text-xs font-medium ${
                mobileTab === tab ? "text-white" : "text-white/45"
              }`}
            >
              <Icon size={19} />
              <span className="capitalize">{tab}</span>
            </button>
          );
        })}
      </nav>

      <DesktopPlayerBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        progress={progress}
        duration={duration}
        currentTime={currentTime}
        volume={volume}
        isMuted={isMuted}
        isLoading={isLoading}
        queueCount={upcomingQueue.length}
        rightTab={rightTab}
        onTogglePlay={togglePlay}
        onPrev={prevSong}
        onNext={nextSong}
        onToggleShuffle={toggleShuffle}
        onToggleRepeat={toggleRepeat}
        onSeek={seek}
        onSetVolume={setVolume}
        onToggleMute={toggleMute}
        onOpenQueue={() => setRightTab("queue")}
        onOpenLyrics={() => setRightTab("lyrics")}
      />

      <MobilePlayerOverlay
        open={isPlayerOpenMobile}
        track={currentSong}
        isPlaying={isPlaying}
        isLoading={isLoading}
        progress={progress}
        duration={duration}
        currentTime={currentTime}
        isLiked={likedIds.has(currentSong?.youtubeId)}
        lyrics={currentLyrics}
        activeTab={mobileOverlayTab}
        queue={upcomingQueue}
        onClose={() => setIsPlayerOpenMobile(false)}
        onTogglePlay={togglePlay}
        onPrev={prevSong}
        onNext={nextSong}
        onSeek={seek}
        onLike={() => currentSong && handleLike(currentSong)}
        onAdd={() => currentSong && setTrackToAdd(currentSong)}
        onSetTab={setMobileOverlayTab}
      />

      {playlistModal.open ? (
        <PlaylistModal
          mode={playlistModal.mode}
          initialName={playlistModal.initialName}
          saving={savingPlaylist}
          onClose={() => setPlaylistModal({ open: false, mode: "create" })}
          onSave={playlistModal.mode === "rename" ? handleRenamePlaylist : handleCreatePlaylist}
        />
      ) : null}

      {trackToAdd ? (
        <AddTrackModal
          playlists={playlists}
          track={trackToAdd}
          saving={addingTrack}
          onClose={() => setTrackToAdd(null)}
          onSelect={handleAddTrackToPlaylist}
        />
      ) : null}

      {profileModalOpen ? (
        <ProfileModal
          user={profile || user}
          saving={savingProfile}
          onClose={() => setProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      ) : null}
    </div>
  );
}
