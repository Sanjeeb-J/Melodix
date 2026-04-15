import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreamUrl } from '../services/streamService';

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
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const PlayerProvider = ({ children }) => {
  const repeatModeRef = useRef('none');
  const queueRef = useRef([]);
  const playbackOrderRef = useRef([]);
  const playbackIndexRef = useRef(0);
  const nextSongFnRef = useRef(null);
  const isMountedRef = useRef(true);

  const [streamUrl, setStreamUrl] = useState(null);
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

  // expo-audio player — starts paused, URL provided via replace()
  const player = useAudioPlayer(streamUrl ? { uri: streamUrl } : null);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status?.playing ?? false;
  const currentTime = status?.currentTime ?? 0;
  const duration = status?.duration ?? 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  // Keep refs in sync
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { playbackOrderRef.current = playbackOrder; }, [playbackOrder]);
  useEffect(() => { playbackIndexRef.current = playbackIndex; }, [playbackIndex]);

  // Set audio mode once on mount
  useEffect(() => {
    isMountedRef.current = true;
    setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    return () => { isMountedRef.current = false; };
  }, []);

  // Handle song ended — advance queue
  useEffect(() => {
    if (status?.didJustFinish) {
      nextSongFnRef.current?.();
    }
  }, [status?.didJustFinish]);

  // Apply volume changes
  useEffect(() => {
    if (player) {
      player.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, player]);

  // ── loadAndPlay: fetch stream URL, set it, then play ──
  const loadAndPlay = useCallback(async (song) => {
    if (!song) return;
    const videoId = song.youtubeId || song.videoId;
    if (!videoId) {
      console.error('[Player] No videoId found for song:', song);
      return;
    }
    setIsLoading(true);
    try {
      const url = await getStreamUrl(videoId);
      console.log('[Player] Stream URL:', url);
      // Replace source and play
      await player.replace({ uri: url });
      player.play();
      setIsLoading(false);
    } catch (err) {
      console.error('[Player] loadAndPlay error:', err);
      setIsLoading(false);
    }
  }, [player]);

  // Trigger load when currentSong changes
  useEffect(() => {
    if (currentSong && player) {
      loadAndPlay(currentSong);
    }
  }, [currentSong]);

  // ── playSong: set queue + kickoff ──
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
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, currentSong, isPlaying]);

  const nextSong = useCallback(() => {
    const q = queueRef.current;
    const order = playbackOrderRef.current;
    const idx = playbackIndexRef.current;
    if (!q.length || !order.length) return;

    const isLast = idx >= order.length - 1;
    if (isLast) {
      if (repeatModeRef.current === 'all') {
        const firstQI = order[0];
        setPlaybackIndex(0);
        setQueueIndex(firstQI);
        setCurrentSong(q[firstQI]);
      }
      return;
    }
    const nextPBI = idx + 1;
    const nextQI = order[nextPBI];
    setPlaybackIndex(nextPBI);
    setQueueIndex(nextQI);
    setCurrentSong(q[nextQI]);
  }, []);

  useEffect(() => { nextSongFnRef.current = nextSong; }, [nextSong]);

  const prevSong = useCallback(() => {
    const q = queueRef.current;
    const order = playbackOrderRef.current;
    const idx = playbackIndexRef.current;
    if (!q.length || !order.length) return;

    if (currentTime > 3) {
      player?.seekTo(0);
      return;
    }
    const prevPBI = idx > 0 ? idx - 1 : order.length - 1;
    const prevQI = order[prevPBI];
    setPlaybackIndex(prevPBI);
    setQueueIndex(prevQI);
    setCurrentSong(q[prevQI]);
  }, [currentTime, player]);

  const seek = useCallback((fraction) => {
    if (!player || !duration) return;
    const posMs = fraction * duration;
    player.seekTo(posMs);
  }, [player, duration]);

  const setVolume = useCallback(async (val) => {
    setVolumeState(val);
    await AsyncStorage.setItem('melodix_volume', String(val));
    setIsMuted(val <= 0);
    if (player) player.volume = val;
  }, [player]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    if (player) player.volume = next ? 0 : volume;
  }, [isMuted, volume, player]);

  const toggleShuffle = useCallback(() => {
    if (!queue.length) { setIsShuffle((v) => !v); return; }
    setIsShuffle((cur) => {
      const next = !cur;
      const currentQI = queue.findIndex((s) => getSongId(s) === getSongId(currentSong)) ?? queueIndex;
      const safeQI = currentQI >= 0 ? currentQI : queueIndex;
      const seqOrder = buildSequentialOrder(queue.length);
      const nextOrder = next
        ? [safeQI, ...shuffleIndices(seqOrder.filter((i) => i !== safeQI))]
        : seqOrder;
      setPlaybackOrder(nextOrder);
      setPlaybackIndex(nextOrder.indexOf(safeQI));
      setQueueIndex(safeQI);
      return next;
    });
  }, [queue, currentSong, queueIndex]);

  const toggleRepeat = useCallback(() =>
    setRepeatMode((m) => (m === 'none' ? 'all' : m === 'all' ? 'one' : 'none')), []);

  // Handle repeat-one via effect
  useEffect(() => {
    if (status?.didJustFinish && repeatModeRef.current === 'one' && player) {
      player.seekTo(0);
      player.play();
    }
  }, [status?.didJustFinish]);

  const playQueueItem = useCallback((pbi) => {
    const q = queueRef.current;
    const order = playbackOrderRef.current;
    if (!q.length || pbi < 0 || pbi >= order.length) return;
    const nextQI = order[pbi];
    const nextS = q[nextQI];
    if (!nextS) return;
    setQueueIndex(nextQI);
    setPlaybackIndex(pbi);
    setCurrentSong(nextS);
  }, []);

  const upcomingQueue = playbackOrder
    .slice(playbackIndex + 1)
    .map((qi, offset) => {
      const song = queue[qi];
      if (!song) return null;
      return { song, queueIndex: qi, playbackOrderIndex: playbackIndex + offset + 1 };
    })
    .filter(Boolean);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, isShuffle, repeatMode,
      volume, isMuted, progress, duration, currentTime,
      isLoading, queue, upcomingQueue,
      playSong, togglePlay, nextSong, prevSong, seek,
      setVolume, toggleMute, toggleShuffle, toggleRepeat, playQueueItem,
      fmtTime,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
