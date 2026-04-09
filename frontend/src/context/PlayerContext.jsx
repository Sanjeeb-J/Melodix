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

const buildSequentialOrder = (length) => Array.from({ length }, (_, index) => index);
const getSongId = (song) => song?.youtubeId || song?.videoId || song?._id || null;

const shuffleIndices = (indices) => {
  const shuffled = [...indices];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

export const PlayerProvider = ({ children }) => {
  const playerRef = useRef(null);
  const playerHostRef = useRef(null);
  const progressTimerRef = useRef(null);
  const pendingVideoIdRef = useRef(null);
  const repeatModeRef = useRef("none");
  const queueRef = useRef([]);
  const playbackOrderRef = useRef([]);
  const playbackIndexRef = useRef(0);
  const nextSongRef = useRef(null);
  const volumeRef = useRef(0.7);
  const isMutedRef = useRef(false);
  const isPlayingRef = useRef(false);

  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playbackOrder, setPlaybackOrder] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
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
      const safeIndex = Math.max(0, Math.min(index, newQueue.length - 1));
      const sequentialOrder = buildSequentialOrder(newQueue.length);
      const nextPlaybackOrder = isShuffle
        ? [safeIndex, ...shuffleIndices(sequentialOrder.filter((item) => item !== safeIndex))]
        : sequentialOrder;

      setQueue(newQueue);
      setQueueIndex(safeIndex);
      setPlaybackOrder(nextPlaybackOrder);
      setPlaybackIndex(nextPlaybackOrder.indexOf(safeIndex));
    }

    setCurrentSong(song);
    setIsPlaying(true);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, [isShuffle]);

  const playNow = useCallback((song) => {
    if (!song) return;

    const currentQueue = queueRef.current;
    const currentOrder = playbackOrderRef.current;
    const currentPlaybackIndex = playbackIndexRef.current;
    const songId = getSongId(song);

    if (!currentQueue.length || !currentOrder.length || !songId) {
      playSong(song);
      return;
    }

    const existingQueueIndex = currentQueue.findIndex(
      (item) => getSongId(item) === songId
    );

    if (existingQueueIndex === -1) {
      setCurrentSong(song);
      setIsPlaying(true);
      setIsLoading(true);
      setLoadingMessage("Loading song...");
      return;
    }

    const existingPlaybackIndex = currentOrder.indexOf(existingQueueIndex);

    if (existingPlaybackIndex === -1) {
      playSong(song, currentQueue, existingQueueIndex);
      return;
    }

    setQueueIndex(existingQueueIndex);
    setPlaybackIndex(existingPlaybackIndex);
    setCurrentSong(currentQueue[existingQueueIndex]);
    setIsPlaying(true);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, [playSong]);

  const playQueueItem = useCallback((playbackOrderIndex) => {
    const currentQueue = queueRef.current;
    const currentOrder = playbackOrderRef.current;

    if (
      !currentQueue.length ||
      !currentOrder.length ||
      playbackOrderIndex < 0 ||
      playbackOrderIndex >= currentOrder.length
    ) {
      return;
    }

    const nextQueueIndex = currentOrder[playbackOrderIndex];
    const nextSong = currentQueue[nextQueueIndex];

    if (!nextSong) return;

    setQueueIndex(nextQueueIndex);
    setPlaybackIndex(playbackOrderIndex);
    setCurrentSong(nextSong);
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
    if (!queue.length || !playbackOrder.length) return;

    const isLastSong = playbackIndex >= playbackOrder.length - 1;
    if (isLastSong) {
      if (repeatModeRef.current === "all") {
        const firstQueueIndex = playbackOrder[0];
        setPlaybackIndex(0);
        setQueueIndex(firstQueueIndex);
        setCurrentSong(queue[firstQueueIndex]);
        setIsPlaying(true);
        setIsLoading(true);
        setLoadingMessage("Loading song...");
      } else {
        setIsPlaying(false);
      }
      return;
    }

    const nextPlaybackIndex = playbackIndex + 1;
    const nextQueueIndex = playbackOrder[nextPlaybackIndex];

    setPlaybackIndex(nextPlaybackIndex);
    setQueueIndex(nextQueueIndex);
    setCurrentSong(queue[nextQueueIndex]);
    setIsPlaying(true);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, [playbackIndex, playbackOrder, queue]);

  const prevSong = useCallback(() => {
    const player = playerRef.current;
    if (!queue.length || !playbackOrder.length) return;

    if (currentTime > 3 && player?.seekTo) {
      player.seekTo(0, true);
      return;
    }

    const prevPlaybackIndex =
      playbackIndex > 0 ? playbackIndex - 1 : playbackOrder.length - 1;
    const prevQueueIndex = playbackOrder[prevPlaybackIndex];

    setPlaybackIndex(prevPlaybackIndex);
    setQueueIndex(prevQueueIndex);
    setCurrentSong(queue[prevQueueIndex]);
    setIsPlaying(true);
    setIsLoading(true);
    setLoadingMessage("Loading song...");
  }, [queue, playbackOrder, playbackIndex, currentTime]);

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

  const toggleShuffle = useCallback(() => {
    if (!queue.length) {
      setIsShuffle((value) => !value);
      return;
    }

    setIsShuffle((currentValue) => {
      const nextValue = !currentValue;
      const currentQueueIndex = queue.findIndex(
        (song) =>
          (song.youtubeId || song.videoId) === (currentSong?.youtubeId || currentSong?.videoId)
      );
      const safeQueueIndex = currentQueueIndex >= 0 ? currentQueueIndex : queueIndex;
      const sequentialOrder = buildSequentialOrder(queue.length);
      const nextOrder = nextValue
        ? [safeQueueIndex, ...shuffleIndices(sequentialOrder.filter((item) => item !== safeQueueIndex))]
        : sequentialOrder;

      setPlaybackOrder(nextOrder);
      setPlaybackIndex(nextOrder.indexOf(safeQueueIndex));
      setQueueIndex(safeQueueIndex);

      return nextValue;
    });
  }, [queue, currentSong, queueIndex]);
  const toggleRepeat = () =>
    setRepeatMode((mode) => (mode === "none" ? "all" : mode === "all" ? "one" : "none"));

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    playbackOrderRef.current = playbackOrder;
  }, [playbackOrder]);

  useEffect(() => {
    playbackIndexRef.current = playbackIndex;
  }, [playbackIndex]);

  useEffect(() => {
    nextSongRef.current = nextSong;
  }, [nextSong]);

  const upcomingQueue = playbackOrder
    .slice(playbackIndex + 1)
    .map((itemIndex, offset) => {
      const song = queue[itemIndex];
      if (!song) return null;

      return {
        song,
        queueIndex: itemIndex,
        playbackOrderIndex: playbackIndex + offset + 1,
      };
    })
    .filter(Boolean);

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
                  } else if (
                    repeatModeRef.current === "all" ||
                    playbackIndexRef.current < playbackOrderRef.current.length - 1
                  ) {
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
              if (playbackIndexRef.current < playbackOrderRef.current.length - 1) {
                window.setTimeout(() => nextSongRef.current?.(), 250);
              }
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
  }, [currentSong, stopProgressTimer]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (volume <= 0 || isMuted) {
      player.mute?.();
      return;
    }

    player.unMute?.();
    player.setVolume?.(Math.round(volume * 100));
  }, [volume, isMuted]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.name || currentSong.title || "Melodix",
      artist: currentSong.artist || "Unknown artist",
      album: currentSong.album || "Melodix",
      artwork: currentSong.thumbnail
        ? [
            { src: currentSong.thumbnail, sizes: "96x96", type: "image/png" },
            { src: currentSong.thumbnail, sizes: "128x128", type: "image/png" },
            { src: currentSong.thumbnail, sizes: "192x192", type: "image/png" },
            { src: currentSong.thumbnail, sizes: "256x256", type: "image/png" },
            { src: currentSong.thumbnail, sizes: "512x512", type: "image/png" },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      playerRef.current?.playVideo?.();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      playerRef.current?.pauseVideo?.();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      prevSong();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      nextSong();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      const player = playerRef.current;
      if (!player?.seekTo) return;
      player.seekTo(Math.max(0, currentTime - 10), true);
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      const player = playerRef.current;
      if (!player?.seekTo) return;
      player.seekTo(Math.min(duration, currentTime + 10), true);
    });
  }, [currentSong, currentTime, duration, nextSong, prevSong]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    if ("setPositionState" in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(currentTime, duration),
        });
      } catch {
        // Ignore platforms that reject position updates for iframe-backed playback.
      }
    }
  }, [isPlaying, currentTime, duration]);

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
        upcomingQueue,
        playSong,
        playNow,
        playQueueItem,
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
