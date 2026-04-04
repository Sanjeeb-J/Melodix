import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const PlayerContext = createContext();
const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";

const loadYouTubeApi = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is only available in the browser"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (window.__melodixYouTubeApiPromise) {
    return window.__melodixYouTubeApiPromise;
  }

  window.__melodixYouTubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${YOUTUBE_API_SRC}"]`);

    const handleReady = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
      }
    };

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      handleReady();
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = YOUTUBE_API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("error", () => reject(new Error("Failed to load YouTube IFrame API")), { once: true });
    }

    window.setTimeout(() => {
      if (!window.YT?.Player) {
        reject(new Error("Timed out while loading YouTube IFrame API"));
      }
    }, 15000);
  });

  return window.__melodixYouTubeApiPromise;
};

export const PlayerProvider = ({ children }) => {
  const playerRef = useRef(null);
  const playerHostRef = useRef(null);
  const progressTimerRef = useRef(null);
  const pendingVideoIdRef = useRef(null);
  const repeatModeRef = useRef("none");
  const queueRef = useRef([]);
  const nextSongRef = useRef(null);
  const volumeRef = useRef(0.7);
  const isMutedRef = useRef(false);
  const isPlayingRef = useRef(false);

  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none");
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem("melodix_volume");
    return saved !== null ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const syncProgress = useCallback(() => {
    const player = playerRef.current;
    if (!player?.getCurrentTime || !player?.getDuration) return;

    const nextCurrentTime = player.getCurrentTime() || 0;
    const nextDuration = player.getDuration() || 0;

    setCurrentTime(nextCurrentTime);
    setDuration(nextDuration);
    setProgress(nextDuration ? nextCurrentTime / nextDuration : 0);
  }, []);

  const startProgressTimer = useCallback(() => {
    stopProgressTimer();
    syncProgress();
    progressTimerRef.current = window.setInterval(syncProgress, 500);
  }, [stopProgressTimer, syncProgress]);

  const playSong = useCallback((song, newQueue = null, index = 0) => {
    if (newQueue) {
      setQueue(newQueue);
      setQueueIndex(index);
    }

    setCurrentSong(song);
    setIsPlaying(true);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !currentSong || !window.YT?.PlayerState) return;

    const state = player.getPlayerState?.();
    if (state === window.YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      setIsLoading(true);
      setLoadingMessage("Loading song...");
      player.playVideo();
    }
  }, [currentSong]);

  const nextSong = useCallback(() => {
    if (!queue.length) return;

    const nextIdx = isShuffle
      ? Math.floor(Math.random() * queue.length)
      : (queueIndex + 1) % queue.length;

    setQueueIndex(nextIdx);
    setCurrentSong(queue[nextIdx]);
    setIsPlaying(true);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, [queue, queueIndex, isShuffle]);

  const prevSong = useCallback(() => {
    const player = playerRef.current;
    if (!queue.length) return;

    if (currentTime > 3 && player?.seekTo) {
      player.seekTo(0, true);
      return;
    }

    const prevIdx = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIdx);
    setCurrentSong(queue[prevIdx]);
    setIsPlaying(true);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, [queue, queueIndex, currentTime]);

  const seek = useCallback((fraction) => {
    const player = playerRef.current;
    if (!player?.seekTo || !duration) return;

    const nextTime = fraction * duration;
    player.seekTo(nextTime, true);
    setCurrentTime(nextTime);
    setProgress(fraction);
  }, [duration]);

  const setVolume = useCallback((val) => {
    const player = playerRef.current;
    setVolumeState(val);
    localStorage.setItem("melodix_volume", val);

    if (player?.setVolume) {
      player.setVolume(Math.round(val * 100));
    }

    if (val <= 0) {
      player?.mute?.();
      setIsMuted(true);
      return;
    }

    player?.unMute?.();
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player?.isMuted) return;

    const nextMuted = !player.isMuted();
    if (nextMuted) {
      player.mute();
    } else {
      player.unMute();
      if (volume > 0) {
        player.setVolume(Math.round(volume * 100));
      }
    }
    setIsMuted(nextMuted);
  }, [volume]);

  const toggleShuffle = () => setIsShuffle((s) => !s);
  const toggleRepeat = () =>
    setRepeatMode((mode) => (mode === "none" ? "all" : mode === "all" ? "one" : "none"));

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    nextSongRef.current = nextSong;
  }, [nextSong]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          if (e.shiftKey) {
            nextSong();
          } else if (playerRef.current?.seekTo) {
            const nextTime = Math.min(duration, currentTime + 10);
            playerRef.current.seekTo(nextTime, true);
          }
          break;
        case "ArrowLeft":
          if (e.shiftKey) {
            prevSong();
          } else if (playerRef.current?.seekTo) {
            const nextTime = Math.max(0, currentTime - 10);
            playerRef.current.seekTo(nextTime, true);
          }
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
  }, [currentTime, duration, nextSong, prevSong, toggleMute, togglePlay]);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || playerRef.current || !playerHostRef.current) return;

        playerRef.current = new YT.Player(playerHostRef.current, {
          height: "0",
          width: "0",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(Math.round(volumeRef.current * 100));
              if (isMutedRef.current || volumeRef.current <= 0) {
                event.target.mute();
              }

              if (pendingVideoIdRef.current) {
                event.target.cueVideoById(pendingVideoIdRef.current);
                if (isPlayingRef.current) {
                  event.target.playVideo();
                }
              }
            },
            onStateChange: (event) => {
              switch (event.data) {
                case YT.PlayerState.BUFFERING:
                  setIsLoading(true);
                  setLoadingMessage("Buffering...");
                  break;
                case YT.PlayerState.PLAYING:
                  setIsPlaying(true);
                  setIsLoading(false);
                  setLoadingMessage("");
                  startProgressTimer();
                  break;
                case YT.PlayerState.PAUSED:
                  setIsPlaying(false);
                  setIsLoading(false);
                  setLoadingMessage("");
                  stopProgressTimer();
                  syncProgress();
                  break;
                case YT.PlayerState.ENDED:
                  stopProgressTimer();
                  setCurrentTime(event.target.getDuration?.() || 0);
                  setProgress(1);
                  if (repeatModeRef.current === "one") {
                    event.target.seekTo(0, true);
                    event.target.playVideo();
                  } else if (repeatModeRef.current === "all" || queueRef.current.length > 1) {
                    nextSongRef.current?.();
                  } else {
                    setIsPlaying(false);
                  }
                  break;
                case YT.PlayerState.CUED:
                  setIsLoading(false);
                  setLoadingMessage("");
                  syncProgress();
                  if (isPlayingRef.current) {
                    event.target.playVideo();
                  }
                  break;
                default:
                  break;
              }
            },
            onError: () => {
              stopProgressTimer();
              setIsLoading(false);
              setLoadingMessage("");
              setIsPlaying(false);
              console.error("[Player] YouTube playback error");
            },
          },
        });
      })
      .catch((error) => {
        console.error("[Player] Failed to initialize YouTube player:", error.message);
        setIsLoading(false);
        setLoadingMessage("");
      });

    return () => {
      cancelled = true;
      stopProgressTimer();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [startProgressTimer, stopProgressTimer, syncProgress]);

  useEffect(() => {
    const player = playerRef.current;
    const videoId = currentSong?.videoId || currentSong?.youtubeId;

    if (!videoId) {
      pendingVideoIdRef.current = null;
      stopProgressTimer();
      setIsPlaying(false);
      setIsLoading(false);
      setLoadingMessage("");
      setCurrentTime(0);
      setDuration(0);
      setProgress(0);
      player?.stopVideo?.();
      return;
    }

    pendingVideoIdRef.current = videoId;
    setIsLoading(true);
    setLoadingMessage("Loading song...");
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);

    if (!player?.loadVideoById) return;

    player.loadVideoById(videoId);
    if (volume <= 0 || isMuted) {
      player.mute();
    } else {
      player.unMute?.();
      player.setVolume?.(Math.round(volume * 100));
    }
  }, [currentSong, isMuted, stopProgressTimer, volume]);

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
      <div
        ref={playerHostRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};
