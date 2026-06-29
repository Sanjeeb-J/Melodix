import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getStreamUrl } from "../services/streamService";
import { logPlay } from "../services/historyService";

const PlayerContext = createContext();

const getSongId = (song) => song?.videoId || song?.youtubeId || song?._id || null;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const shuffleQueue = (items, currentIndex) => {
  const rest = items.map((_, index) => index).filter((index) => index !== currentIndex);
  for (let index = rest.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [rest[index], rest[swapIndex]] = [rest[swapIndex], rest[index]];
  }
  return [currentIndex, ...rest];
};

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const playLoggedRef = useRef(false);
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef("none");
  const shuffleOrderRef = useRef([]);
  const shufflePointerRef = useRef(0);

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem("melodix_volume") || 0.7));
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none");
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const playSong = useCallback((song, newQueue = null, index = 0) => {
    if (!song) return;

    if (newQueue?.length) {
      const safeIndex = clamp(index, 0, newQueue.length - 1);
      queueRef.current = newQueue;
      queueIndexRef.current = safeIndex;
      setQueue(newQueue);
      setQueueIndex(safeIndex);
      if (isShuffle) {
        shuffleOrderRef.current = shuffleQueue(newQueue, safeIndex);
        shufflePointerRef.current = 0;
      }
    } else if (!queueRef.current.length) {
      queueRef.current = [song];
      queueIndexRef.current = 0;
      setQueue([song]);
      setQueueIndex(0);
    }

    playLoggedRef.current = false;
    setCurrentSong(song);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, [isShuffle]);

  const playNow = useCallback((song) => {
    const songId = getSongId(song);
    const existingIndex = queueRef.current.findIndex((item) => getSongId(item) === songId);
    if (existingIndex >= 0) {
      queueIndexRef.current = existingIndex;
      setQueueIndex(existingIndex);
    }
    playSong(song);
  }, [playSong]);

  const playQueue = useCallback((songs, startIndex = 0) => {
    if (!songs?.length) return;
    const safeIndex = clamp(startIndex, 0, songs.length - 1);
    playSong(songs[safeIndex], songs, safeIndex);
  }, [playSong]);

  const playQueueItem = useCallback((index) => {
    const song = queueRef.current[index];
    if (!song) return;
    queueIndexRef.current = index;
    setQueueIndex(index);
    playSong(song);
  }, [playSong]);

  const nextSong = useCallback(() => {
    const items = queueRef.current;
    if (!items.length) return;

    let nextIndex = queueIndexRef.current + 1;
    if (isShuffle && shuffleOrderRef.current.length) {
      shufflePointerRef.current += 1;
      nextIndex = shuffleOrderRef.current[shufflePointerRef.current];
    }

    if (nextIndex === undefined || nextIndex >= items.length) {
      if (repeatModeRef.current !== "all") {
        audioRef.current?.pause();
        setIsPlaying(false);
        return;
      }
      nextIndex = 0;
      shufflePointerRef.current = 0;
    }

    queueIndexRef.current = nextIndex;
    setQueueIndex(nextIndex);
    playSong(items[nextIndex]);
  }, [isShuffle, playSong]);

  const prevSong = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const items = queueRef.current;
    if (!items.length) return;
    const prevIndex = clamp(queueIndexRef.current - 1, 0, items.length - 1);
    queueIndexRef.current = prevIndex;
    setQueueIndex(prevIndex);
    playSong(items[prevIndex]);
  }, [playSong]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [currentSong]);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => audioRef.current?.play?.(), []);

  const seek = useCallback((fractionOrSeconds) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const nextTime = fractionOrSeconds <= 1 ? fractionOrSeconds * duration : fractionOrSeconds;
    audio.currentTime = clamp(nextTime, 0, duration);
  }, [duration]);

  const setVolume = useCallback((value) => {
    const nextVolume = clamp(value, 0, 1);
    setVolumeState(nextVolume);
    localStorage.setItem("melodix_volume", String(nextVolume));
    if (audioRef.current) audioRef.current.volume = nextVolume;
    if (nextVolume > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((value) => {
      const next = !value;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((value) => {
      const next = !value;
      if (next) {
        shuffleOrderRef.current = shuffleQueue(queueRef.current, queueIndexRef.current);
        shufflePointerRef.current = 0;
      } else {
        shuffleOrderRef.current = [];
      }
      return next;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((mode) => {
      const next = mode === "none" ? "all" : mode === "all" ? "one" : "none";
      repeatModeRef.current = next;
      return next;
    });
  }, []);

  const addToQueue = useCallback((song) => {
    queueRef.current = [...queueRef.current, song];
    setQueue(queueRef.current);
  }, []);

  const removeFromQueue = useCallback((index) => {
    queueRef.current = queueRef.current.filter((_, itemIndex) => itemIndex !== index);
    queueIndexRef.current = clamp(queueIndexRef.current, 0, Math.max(queueRef.current.length - 1, 0));
    setQueue(queueRef.current);
    setQueueIndex(queueIndexRef.current);
  }, []);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    audio.src = getStreamUrl(getSongId(currentSong));
    audio.load();
    setIsLoading(true);
    setLoadingMessage("Loading song...");
    audio.play().catch(() => {
      setIsPlaying(false);
      setIsLoading(false);
      setLoadingMessage("");
    });
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const sync = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setCurrentTime(audio.currentTime || 0);
      setDuration(nextDuration);
      setProgress(nextDuration ? audio.currentTime / nextDuration : 0);

      if (!playLoggedRef.current && audio.currentTime >= 10 && currentSong) {
        playLoggedRef.current = true;
        logPlay({
          ...currentSong,
          videoId: getSongId(currentSong),
          title: currentSong.title || currentSong.name,
          duration: Math.round(nextDuration),
        }).catch(() => {});
      }
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setLoadingMessage("");
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => {
      setIsLoading(true);
      setLoadingMessage("Buffering...");
    };
    const onEnded = () => {
      if (repeatModeRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
        return;
      }
      nextSong();
    };
    const onError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setLoadingMessage("");
    };

    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("loadedmetadata", sync);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("loadedmetadata", sync);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [currentSong, nextSong]);

  const upcomingQueue = queue.slice(queueIndex + 1).map((song, offset) => ({
    song,
    queueIndex: queueIndex + offset + 1,
    playbackOrderIndex: queueIndex + offset + 1,
  }));

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        isShuffled: isShuffle,
        repeatMode,
        queue,
        queueIndex,
        upcomingQueue,
        isLoading,
        loadingMessage,
        play: playSong,
        playSong,
        playNow,
        playQueue,
        playQueueItem,
        pause,
        resume,
        togglePlay,
        next: nextSong,
        nextSong,
        prev: prevSong,
        prevSong,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat: toggleRepeat,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
      }}
    >
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
