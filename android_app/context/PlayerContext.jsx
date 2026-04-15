import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
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

const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export { fmtTime };

export const PlayerProvider = ({ children }) => {
  const soundRef = useRef(null);
  const repeatModeRef = useRef('none');
  const queueRef = useRef([]);
  const playbackOrderRef = useRef([]);
  const playbackIndexRef = useRef(0);
  const nextSongFnRef = useRef(null);
  const isMountedRef = useRef(true);

  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playbackOrder, setPlaybackOrder] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none');
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Keep refs in sync
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { playbackOrderRef.current = playbackOrder; }, [playbackOrder]);
  useEffect(() => { playbackIndexRef.current = playbackIndex; }, [playbackIndex]);

  useEffect(() => {
    isMountedRef.current = true;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: 1,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 1,
      playThroughEarpieceAndroid: false,
    });
    return () => {
      isMountedRef.current = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadAndPlay = useCallback(async (song, shouldPlay = true) => {
    if (!song) return;
    const videoId = song.youtubeId || song.videoId;
    if (!videoId) return;

    setIsLoading(true);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const streamUrl = await getStreamUrl(videoId);
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay, volume: isMuted ? 0 : volume },
        (status) => {
          if (!isMountedRef.current || !status.isLoaded) return;
          setIsPlaying(status.isPlaying);
          setIsLoading(status.isBuffering && !status.isPlaying);
          if (status.durationMillis) {
            const dur = status.durationMillis / 1000;
            setDuration(dur);
            const pos = (status.positionMillis || 0) / 1000;
            setCurrentTime(pos);
            setProgress(dur > 0 ? pos / dur : 0);
          }
          if (status.didJustFinish) {
            nextSongFnRef.current?.();
          }
        }
      );
      soundRef.current = sound;
      setIsLoading(false);
    } catch (err) {
      console.error('[Player] loadAndPlay error:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [volume, isMuted]);

  // Load song when currentSong changes
  useEffect(() => {
    if (currentSong) {
      loadAndPlay(currentSong, true);
    } else {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentSong]);

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
    setIsPlaying(true);
  }, [isShuffle]);

  const togglePlay = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound || !currentSong) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch {}
  }, [currentSong]);

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
      } else {
        setIsPlaying(false);
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
      soundRef.current?.setPositionAsync(0);
      return;
    }
    const prevPBI = idx > 0 ? idx - 1 : order.length - 1;
    const prevQI = order[prevPBI];
    setPlaybackIndex(prevPBI);
    setQueueIndex(prevQI);
    setCurrentSong(q[prevQI]);
  }, [currentTime]);

  const seek = useCallback(async (fraction) => {
    const sound = soundRef.current;
    if (!sound || !duration) return;
    const posMs = fraction * duration * 1000;
    await sound.setPositionAsync(posMs);
    setCurrentTime(fraction * duration);
    setProgress(fraction);
  }, [duration]);

  const setVolume = useCallback(async (val) => {
    setVolumeState(val);
    await AsyncStorage.setItem('melodix_volume', String(val));
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(Math.max(0, Math.min(1, val)));
    }
    setIsMuted(val <= 0);
  }, []);

  const toggleMute = useCallback(async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(next ? 0 : volume);
    }
  }, [isMuted, volume]);

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
