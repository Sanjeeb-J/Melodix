import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Modal, Pressable, FlatList,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';
import { usePlayer, fmtTime } from '../context/PlayerContext';

export default function MiniPlayer() {
  const {
    currentSong, isPlaying, isLoading,
    progress, duration, currentTime,
    isShuffle, repeatMode, volume, isMuted,
    upcomingQueue,
    togglePlay, nextSong, prevSong, seek,
    setVolume, toggleMute, toggleShuffle, toggleRepeat, playQueueItem,
  } = usePlayer();

  const [expanded, setExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  if (!currentSong) return null;

  const RepeatIcon = repeatMode === 'one' ? 'repeat-one' : 'repeat';
  const VolumeIcon = isMuted || volume === 0 ? 'volume-off' : volume < 0.5 ? 'volume-down' : 'volume-up';

  return (
    <>
      {/* Mini Player Bar */}
      {!expanded && (
        <TouchableOpacity style={styles.miniBar} onPress={() => setExpanded(true)} activeOpacity={0.9}>
          <Image source={{ uri: currentSong.thumbnail }} style={styles.miniThumb} />
          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>{currentSong.name || currentSong.title}</Text>
            <Text style={styles.miniArtist} numberOfLines={1}>{currentSong.artist}</Text>
          </View>
          <View style={styles.miniControls}>
            <TouchableOpacity onPress={prevSong} style={styles.miniBtn}>
              <MaterialIcons name="skip-previous" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={styles.miniPlayBtn}>
              <MaterialIcons
                name={isLoading ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'}
                size={24} color="#000"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextSong} style={styles.miniBtn}>
              <MaterialIcons name="skip-next" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* Progress bar */}
          <View style={styles.miniProgress}>
            <View style={[styles.miniProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        </TouchableOpacity>
      )}

      {/* Full Player Modal */}
      <Modal visible={expanded} animationType="slide" transparent>
        <View style={styles.fullContainer}>
          <View style={styles.fullInner}>
            {/* Drag handle */}
            <TouchableOpacity style={styles.dragHandle} onPress={() => setExpanded(false)}>
              <View style={styles.dragBar} />
            </TouchableOpacity>

            {/* Cover */}
            <Image source={{ uri: currentSong.thumbnail }} style={styles.fullCover} />

            {/* Song info */}
            <View style={styles.fullInfo}>
              <Text style={styles.fullTitle} numberOfLines={2}>{currentSong.name || currentSong.title}</Text>
              <Text style={styles.fullArtist} numberOfLines={1}>{currentSong.artist}</Text>
            </View>

            {/* Progress slider */}
            <View style={styles.progressRow}>
              <Text style={styles.timeText}>{fmtTime(currentTime)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={progress}
                onSlidingComplete={(val) => seek(val)}
                minimumTrackTintColor="#1db954"
                maximumTrackTintColor="rgba(255,255,255,0.15)"
                thumbTintColor="#1db954"
              />
              <Text style={styles.timeText}>{fmtTime(duration)}</Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={toggleShuffle}>
                <MaterialIcons name="shuffle" size={22} color={isShuffle ? '#1db954' : '#737373'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={prevSong}>
                <MaterialIcons name="skip-previous" size={36} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
                <MaterialIcons
                  name={isLoading ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'}
                  size={36} color="#000"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={nextSong}>
                <MaterialIcons name="skip-next" size={36} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={toggleRepeat}>
                <MaterialIcons name={RepeatIcon} size={22} color={repeatMode !== 'none' ? '#1db954' : '#737373'} />
              </TouchableOpacity>
            </View>

            {/* Volume + Queue */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity onPress={toggleMute}>
                <MaterialIcons name={VolumeIcon} size={22} color="#737373" />
              </TouchableOpacity>
              <Slider
                style={{ flex: 1, marginHorizontal: 8 }}
                minimumValue={0}
                maximumValue={1}
                value={isMuted ? 0 : volume}
                onValueChange={(val) => setVolume(val)}
                minimumTrackTintColor="#1db954"
                maximumTrackTintColor="rgba(255,255,255,0.15)"
                thumbTintColor="#fff"
              />
              <TouchableOpacity onPress={() => setShowQueue(true)}>
                <MaterialIcons name="queue-music" size={22} color="#737373" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Queue Sheet */}
      <Modal visible={showQueue} animationType="slide" transparent>
        <Pressable style={styles.queueOverlay} onPress={() => setShowQueue(false)} />
        <View style={styles.queueSheet}>
          <View style={styles.dragBar} />
          <Text style={styles.queueTitle}>Queue</Text>
          <View style={styles.nowPlayingRow}>
            <Image source={{ uri: currentSong.thumbnail }} style={styles.queueThumb} />
            <View style={styles.queueInfo}>
              <Text style={styles.queueSongTitle} numberOfLines={1}>{currentSong.name || currentSong.title}</Text>
              <Text style={styles.queueSongArtist} numberOfLines={1}>{currentSong.artist}</Text>
            </View>
            <MaterialIcons name="equalizer" size={18} color="#1db954" />
          </View>
          <Text style={styles.queueSectionLabel}>Next up</Text>
          <FlatList
            data={upcomingQueue}
            keyExtractor={(item, i) => `${item.song.youtubeId || item.song.videoId}-${i}`}
            style={{ maxHeight: 320 }}
            ListEmptyComponent={<Text style={styles.queueEmpty}>End of queue</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.queueItem}
                onPress={() => { playQueueItem(item.playbackOrderIndex); setShowQueue(false); }}
              >
                <Image source={{ uri: item.song.thumbnail }} style={styles.queueThumb} />
                <View style={styles.queueInfo}>
                  <Text style={styles.queueSongTitle} numberOfLines={1}>{item.song.name || item.song.title}</Text>
                  <Text style={styles.queueSongArtist} numberOfLines={1}>
                    {item.song.artist} {item.song.duration ? `· ${item.song.duration}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Mini bar
  miniBar: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    backgroundColor: '#282828', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, elevation: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  miniThumb: { width: 44, height: 44, borderRadius: 4, marginRight: 12 },
  miniInfo: { flex: 1, marginRight: 8 },
  miniTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  miniArtist: { color: '#737373', fontSize: 11, marginTop: 2 },
  miniControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBtn: { padding: 4 },
  miniPlayBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1db954',
    alignItems: 'center', justifyContent: 'center',
  },
  miniProgress: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  miniProgressFill: { height: 2, backgroundColor: '#1db954' },

  // Full player
  fullContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  fullInner: {
    backgroundColor: '#181818', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, alignItems: 'center',
  },
  dragHandle: { width: '100%', alignItems: 'center', paddingBottom: 16 },
  dragBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  fullCover: { width: 260, height: 260, borderRadius: 16, marginBottom: 24, elevation: 8 },
  fullInfo: { width: '100%', alignItems: 'center', marginBottom: 20 },
  fullTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  fullArtist: { color: '#737373', fontSize: 15, marginTop: 4 },

  progressRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8, marginBottom: 16 },
  timeText: { color: '#737373', fontSize: 11, fontFamily: 'monospace', minWidth: 34 },
  slider: { flex: 1, height: 40 },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20, width: '100%' },
  ctrlBtn: { padding: 8 },
  playBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1db954',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },

  secondaryRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },

  // Queue
  queueOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  queueSheet: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  queueTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16, marginTop: 8 },
  nowPlayingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  queueSectionLabel: { color: 'rgba(164,255,198,0.8)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  queueItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  queueThumb: { width: 42, height: 42, borderRadius: 4 },
  queueInfo: { flex: 1 },
  queueSongTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  queueSongArtist: { color: '#737373', fontSize: 11, marginTop: 2 },
  queueEmpty: { color: '#737373', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
