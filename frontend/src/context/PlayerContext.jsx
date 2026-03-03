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
  const [volume, setVolumeState] = useState(1);
  const [progress, setProgress] = useState(0); // 0–1
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);


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
    if (audioRef.current) audioRef.current.volume = val;
  }, []);

  const toggleShuffle = () => setIsShuffle((s) => !s);
  const toggleRepeat = () =>
    setRepeatMode((m) => (m === "none" ? "all" : m === "all" ? "one" : "none"));

  // When currentSong changes, load it
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;
    const src = getStreamUrl(currentSong.videoId || currentSong.youtubeId);
    audioRef.current.src = src;
    audioRef.current.volume = volume;
    audioRef.current.play().catch(() => {});
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
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
      if (isPlaying) audio.play().catch(() => {});
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = (e) => {
      console.error("[Player] Audio error:", audio.error?.message || e);
      setIsLoading(false);
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
        progress,
        duration,
        currentTime,
        isLoading,
        queue,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        seek,
        setVolume,
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
