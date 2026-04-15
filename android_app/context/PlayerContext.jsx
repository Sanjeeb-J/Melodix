import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreamSource } from '../services/streamService';

const PlayerContext = createContext();

const buildSequentialOrder = (length) => Array.from({ length }, (_, i) => i);
const getSongId = (song) => song?.youtubeId || song?.videoId || song?._id || null;

const shuffleIndices = (indices) => {
  const shuffled = [...indices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const fmtTime = (s) => {
  if (!s || isNaN(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playbackOrder, setPlaybackOrder] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none');
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for stable internal tracking
  const repeatModeRef = useRef('none');
  const queueRef = useRef([]);
  const playbackOrderRef = useRef([]);
  const playbackIndexRef = useRef(0);
  const nextSongFnRef = useRef(null);
  const isFinishHandledRef = useRef(false);
  const lastLoadedVideoIdRef = useRef(null);
  const shouldAutoplayRef = useRef(false);

  // expo-audio: create the player instance
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const isPlaying = status?.playing ?? false;
  const currentTime = status?.currentTime ?? 0;
  const duration = status?.duration ?? 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  // Keep refs in sync (no re-renders)
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { playbackOrderRef.current = playbackOrder; }, [playbackOrder]);
  useEffect(() => { playbackIndexRef.current = playbackIndex; }, [playbackIndex]);

  // Unified Mount Effect
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch((e) => console.warn('[Player] setAudioModeAsync error:', e));
  }, []);

  // Handle Song Finish
  useEffect(() => {
    if (status?.didJustFinish && !isFinishHandledRef.current) {
      isFinishHandledRef.current = true;
      if (repeatModeRef.current === 'one') {
        player.seekTo(0);
        player.play();
      } else {
        nextSongFnRef.current?.();
      }
      setTimeout(() => { isFinishHandledRef.current = false; }, 500);
    }
  }, [status?.didJustFinish, player]);

  // Handle Volume/Mute
  useEffect(() => {
    if (player) {
      player.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, player]);

  // Handle Lock Screen (Guard against unavailable API in some SDK 54 versions)
  useEffect(() => {
    if (!player || !currentSong) return;
    if (typeof player.setActiveForLockScreen === 'function') {
      player.setActiveForLockScreen(true, {
        title: currentSong.name || currentSong.title || 'Unknown',
        artist: currentSong.artist || '',
        artworkUrl: currentSong.thumbnail || '',
      });
    } else {
      console.log('[Player] setActiveForLockScreen not available in this version of expo-audio');
    }
  }, [currentSong, player]);

  // Core loading function
  const loadAndPlayInner = useCallback(async (song) => {
    const videoId = song?.youtubeId || song?.videoId;
    if (!videoId || videoId === lastLoadedVideoIdRef.current) return;

    lastLoadedVideoIdRef.current = videoId;
    setIsLoading(true);
    try {
      const source = await getStreamSource(videoId);
      shouldAutoplayRef.current = true;
      player.pause();
      player.replace(source);
    } catch (err) {
      console.error('[Player] Load failed:', err);
      shouldAutoplayRef.current = false;
      setIsLoading(false);
    }
  }, [player]);

  // Load when song changes
  useEffect(() => {
    if (currentSong) {
      loadAndPlayInner(currentSong);
    }
  }, [currentSong, loadAndPlayInner]);

  // Handle autoplay when loaded
  useEffect(() => {
    if (shouldAutoplayRef.current && status?.isLoaded) {
      shouldAutoplayRef.current = false;
      player.play();
      setIsLoading(false);
    }
  }, [status?.isLoaded, player]);

  // --- Callbacks ---
  const playSong = useCallback((song, newQueue = null, index = 0) => {
    if (newQueue) {
      const safeIndex = Math.max(0, Math.min(index, newQueue.length - 1));
      const seqOrder = buildSequentialOrder(newQueue.length);
      const nextOrder = isShuffle
        ? [safeIndex, ...shuffleIndices(seqOrder.filter((i) => i !== safeIndex))]
        : seqOrder;
      setQueue(newQueue);
      setQueueIndex(safeIndex);
      setPlaybackOrder(nextOrder);
      setPlaybackIndex(nextOrder.indexOf(safeIndex));
    }
    setCurrentSong(song);
  }, [isShuffle]);

  const togglePlay = useCallback(() => {
    if (!player || !currentSong) return;
    if (!status?.isLoaded) {
      shouldAutoplayRef.current = true;
      return;
    }
    isPlaying ? player.pause() : player.play();
  }, [player, currentSong, isPlaying, status?.isLoaded]);

  const nextSong = useCallback(() => {
    const q = queueRef.current;
    const order = playbackOrderRef.current;
    const idx = playbackIndexRef.current;
    if (!q.length || !order.length) return;

    if (idx >= order.length - 1) {
      if (repeatModeRef.current === 'all') {
        setPlaybackIndex(0);
        setQueueIndex(order[0]);
        setCurrentSong(q[order[0]]);
      }
      return;
    }
    setPlaybackIndex(idx + 1);
    setQueueIndex(order[idx + 1]);
    setCurrentSong(q[order[idx + 1]]);
  }, []);

  const prevSong = useCallback(() => {
    const q = queueRef.current;
    const order = playbackOrderRef.current;
    const idx = playbackIndexRef.current;
    if (!q.length || !order.length) return;

    if (player.status?.currentTime > 3) {
      player.seekTo(0);
      return;
    }
    const prevPBI = idx > 0 ? idx - 1 : order.length - 1;
    setPlaybackIndex(prevPBI);
    setQueueIndex(order[prevPBI]);
    setCurrentSong(q[order[prevPBI]]);
  }, [player]);

  useEffect(() => { nextSongFnRef.current = nextSong; }, [nextSong]);

  const seek = useCallback((fraction) => {
    if (player && duration) player.seekTo(fraction * duration);
  }, [player, duration]);

  const setVolume = useCallback(async (val) => {
    setVolumeState(val);
    AsyncStorage.setItem('melodix_volume', String(val));
    setIsMuted(val <= 0);
  }, []);

  const toggleMute = useCallback(() => setIsMuted(m => !m), []);
  const toggleShuffle = useCallback(() => setIsShuffle(s => !s), []);
  const toggleRepeat = useCallback(() => setRepeatMode(m => (m === 'none' ? 'all' : m === 'all' ? 'one' : 'none')), []);

  const playQueueItem = useCallback((pbi) => {
    const q = queueRef.current;
    const order = playbackOrderRef.current;
    if (q.length && pbi >= 0 && pbi < order.length) {
      setQueueIndex(order[pbi]);
      setPlaybackIndex(pbi);
      setCurrentSong(q[order[pbi]]);
    }
  }, []);

  const upcomingQueue = useMemo(() => 
    playbackOrder.slice(playbackIndex + 1).map((qi, offset) => {
      const song = queue[qi];
      return song ? { song, queueIndex: qi, playbackOrderIndex: playbackIndex + offset + 1 } : null;
    }).filter(Boolean),
  [playbackOrder, playbackIndex, queue]);

  // --- MEMOIZED CONTEXT VALUE ---
  const value = useMemo(() => ({
    currentSong, isPlaying, isShuffle, repeatMode,
    volume, isMuted, progress, duration, currentTime,
    isLoading, queue, upcomingQueue,
    playSong, togglePlay, nextSong, prevSong, seek,
    setVolume, toggleMute, toggleShuffle, toggleRepeat, playQueueItem,
    fmtTime,
  }), [
    currentSong, isPlaying, isShuffle, repeatMode,
    volume, isMuted, progress, duration, currentTime,
    isLoading, queue, upcomingQueue,
    playSong, togglePlay, nextSong, prevSong, seek,
    setVolume, toggleMute, toggleShuffle, toggleRepeat, playQueueItem
  ]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
