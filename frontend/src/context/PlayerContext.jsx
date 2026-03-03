import { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";
import { getStreamUrl } from "../services/streamService";

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none"); // "none" | "all" | "one"
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem("melodix_volume");
    return saved !== null ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");


  // Play a song, optionally with a queue context
  const playSong = useCallback((song, newQueue = null, index = 0) => {
    if (newQueue) {
      setQueue(newQueue);
      setQueueIndex(index);
    }
    setCurrentSong(song);
    setIsPlaying(true);
    setIsLoading(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying((p) => !p);
  }, [isPlaying, currentSong]);

  const nextSong = useCallback(() => {
    if (!queue.length) return;
    let nextIdx;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = (queueIndex + 1) % queue.length;
    }
    setQueueIndex(nextIdx);
    setCurrentSong(queue[nextIdx]);
    setIsPlaying(true);
    setIsLoading(true);
  }, [queue, queueIndex, isShuffle]);

  const prevSong = useCallback(() => {
    if (!queue.length) return;
    if (currentTime > 3) {
      // Restart current song
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    const prevIdx = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIdx);
    setCurrentSong(queue[prevIdx]);
    setIsPlaying(true);
    setIsLoading(true);
  }, [queue, queueIndex, currentTime]);

  const seek = useCallback((fraction) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = fraction * duration;
    setProgress(fraction);
  }, [duration]);

  const setVolume = useCallback((val) => {
    setVolumeState(val);
    localStorage.setItem("melodix_volume", val);
    if (audioRef.current) audioRef.current.volume = val;
    if (val > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
  }, [isMuted]);

  const toggleShuffle = () => setIsShuffle((s) => !s);
  const toggleRepeat = () =>
    setRepeatMode((m) => (m === "none" ? "all" : m === "all" ? "one" : "none"));

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          if (e.shiftKey) { nextSong(); } 
          else if (audioRef.current) { audioRef.current.currentTime += 10; }
          break;
        case "ArrowLeft":
          if (e.shiftKey) { prevSong(); } 
          else if (audioRef.current) { audioRef.current.currentTime -= 10; }
          break;
        case "KeyL":
          toggleRepeat();
          break;
        case "KeyS":
          toggleShuffle();
          break;
        case "KeyM":
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, nextSong, prevSong, toggleRepeat, toggleShuffle, toggleMute]);

  // Track current blob URL to revoke on song change
  const blobUrlRef = useRef(null);

  // When currentSong changes, fetch audio as blob then play
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;
    const videoId = currentSong.videoId || currentSong.youtubeId;
    if (!videoId) return;

    setIsLoading(true);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    // Stop any existing playback
    audioRef.current.pause();
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    audioRef.current.src = "";

    try {
      const streamUrl = getStreamUrl(videoId);
      
      if (audioRef.current) {
        // Point audio element directly to our proxy endpoint
        audioRef.current.src = streamUrl;
        audioRef.current.volume = volume;
        audioRef.current.load();
        audioRef.current.play().catch((err) => {
          console.warn("[Player] Auto-play prevented or error:", err.message);
        });
      }
    } catch (err) {
      console.error("[Player] Failed to setup audio src:", err.message);
      setIsLoading(false);
      setIsPlaying(false);
    }

  }, [currentSong?.videoId, currentSong?.youtubeId]);



  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === "all" || queue.length > 1) {
        nextSong();
      } else {
        setIsPlaying(false);
      }
    };
    const onCanPlay = () => {
      setIsLoading(false);
      setLoadingMessage("");
      if (isPlaying) audio.play().catch(() => {});
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = (e) => {
      console.error("[Player] Audio error:", audio.error?.message || e);
      setIsLoading(false);
      setLoadingMessage("");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [repeatMode, nextSong, isPlaying]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isShuffle,
        repeatMode,
        volume,
        isMuted,
        progress,
        duration,
        currentTime,
        isLoading,
        loadingMessage,
        queue,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};
