import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import {
  searchYouTube, searchYouTubeMusic,
  getYouTubePlaylistTracks, getYouTubeAlbumTracks, getYouTubeArtistTracks,
} from '../../services/youtubeService';
import { addSongFromYouTube, getPlaylists } from '../../services/playlistService';

const FILTER_OPTIONS = [
  { id: 'songs', label: 'Songs', icon: 'library-music' },
  { id: 'playlists', label: 'Playlists', icon: 'playlist-play' },
  { id: 'albums', label: 'Albums', icon: 'album' },
  { id: 'artists', label: 'Artists', icon: 'mic' },
];

export default function SearchScreen() {
  const { playSong } = usePlayer();
  const { token } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('songs');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [pendingSong, setPendingSong] = useState(null);
  const [toast, setToast] = useState('');
  const searchCache = useRef({});

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    const cacheKey = `${filter}:${query.trim().toLowerCase()}`;
    if (searchCache.current[cacheKey]) {
      setResults(searchCache.current[cacheKey]);
      return;
    }
    setLoading(true);
    try {
      const data = filter === 'songs'
        ? await searchYouTube(query)
        : await searchYouTubeMusic(query, filter);
      searchCache.current[cacheKey] = data;
      setResults(data);
    } catch (err) {
      showToast(err?.status === 429 ? 'Too many searches — please wait' : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMusicResult = async (item) => {
    setLoading(true);
    try {
      if (item.type === 'playlist') {
        const tracks = await getYouTubePlaylistTracks(item.playlistId);
        if (!tracks.length) { showToast('No playable songs'); return; }
        playSong(tracks[0], tracks, 0);
      } else if (item.type === 'album') {
        const data = await getYouTubeAlbumTracks(item.browseId);
        if (!data.tracks?.length) { showToast('No playable songs'); return; }
        playSong(data.tracks[0], data.tracks, 0);
      } else {
        const data = await getYouTubeArtistTracks(item.browseId);
        if (!data.tracks?.length) { showToast('No songs found'); return; }
        playSong(data.tracks[0], data.tracks, 0);
      }
      showToast('Now playing!');
    } catch { showToast('Could not load result'); }
    finally { setLoading(false); }
  };

  const handleAddSong = async (song) => {
    // Load playlists for picker
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch {}
    setPendingSong(song);
    setShowPlaylistPicker(true);
  };

  const confirmAdd = async (playlist) => {
    if (!pendingSong) return;
    setShowPlaylistPicker(false);
    setAddingId(pendingSong.videoId);
    try {
      await addSongFromYouTube(playlist._id, {
        name: pendingSong.title,
        artist: pendingSong.artist,
        album: 'YouTube',
        duration: pendingSong.duration,
        youtubeId: pendingSong.videoId,
        youtubeLink: pendingSong.youtubeLink,
        thumbnail: pendingSong.thumbnail,
      });
      showToast(`Added to ${playlist.name}`);
    } catch { showToast('Failed to add song'); }
    finally { setAddingId(null); setPendingSong(null); }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#737373" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to play?"
            placeholderTextColor="#737373"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
              <MaterialIcons name="close" size={18} color="#737373" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={styles.searchBtnText}>Go</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.filterChip, filter === opt.id && styles.filterChipActive]}
            onPress={() => { setFilter(opt.id); setResults([]); }}
          >
            <MaterialIcons name={opt.icon} size={14} color={filter === opt.id ? '#000' : '#fff'} />
            <Text style={[styles.filterLabel, filter === opt.id && styles.filterLabelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item, i) => item.videoId || item.playlistId || item.browseId || String(i)}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }}
        ListEmptyComponent={
          !loading && query ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="search" size={48} color="#383838" />
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          if (filter === 'songs') {
            return (
              <TouchableOpacity
                style={styles.songRow}
                onPress={() => playSong(item, results, index)}
                activeOpacity={0.7}
              >
                <Text style={styles.songIndex}>{index + 1}</Text>
                <Image source={{ uri: item.thumbnail }} style={styles.songThumb} />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                </View>
                <Text style={styles.songDuration}>{item.duration}</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddSong(item)}
                  disabled={addingId === item.videoId}
                >
                  {addingId === item.videoId
                    ? <ActivityIndicator size="small" color="#737373" />
                    : <MaterialIcons name="add" size={20} color="#737373" />
                  }
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              style={styles.musicCard}
              onPress={() => handleOpenMusicResult(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.thumbnail }}
                style={[styles.musicCardImg, item.type === 'artist' && styles.musicCardRound]}
              />
              <Text style={styles.musicCardTitle} numberOfLines={1}>{item.title || item.name}</Text>
              <Text style={styles.musicCardSub} numberOfLines={1}>
                {item.author || item.artist || item.subscribers || 'YouTube Music'}
              </Text>
            </TouchableOpacity>
          );
        }}
        numColumns={filter !== 'songs' ? 2 : 1}
        key={filter !== 'songs' ? 'grid' : 'list'}
      />

      {/* Toast */}
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {/* Playlist Picker Modal */}
      {showPlaylistPicker && (
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Playlist</Text>
            <FlatList
              data={playlists}
              keyExtractor={(p) => p._id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => confirmAdd(item)}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  <Text style={styles.modalItemSub}>{item.songs?.length || 0} songs</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No playlists found</Text>}
            />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPlaylistPicker(false)}>
              <Text style={{ color: '#737373', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },

  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 30, paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, color: '#000', fontSize: 14 },
  searchBtn: {
    backgroundColor: '#1db954', borderRadius: 24,
    paddingHorizontal: 18, height: 46, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  filtersScroll: { marginBottom: 12 },
  filters: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
  },
  filterChipActive: { backgroundColor: '#fff' },
  filterLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filterLabelActive: { color: '#000' },

  list: { flex: 1 },
  songRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  songIndex: { color: '#737373', fontSize: 12, width: 20, textAlign: 'center' },
  songThumb: { width: 44, height: 44, borderRadius: 4 },
  songInfo: { flex: 1 },
  songTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  songArtist: { color: '#737373', fontSize: 12, marginTop: 2 },
  songDuration: { color: '#737373', fontSize: 11, fontFamily: 'monospace' },
  addBtn: { padding: 4 },

  musicCard: { flex: 1, margin: 6, padding: 12, backgroundColor: '#181818', borderRadius: 12 },
  musicCardImg: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 10 },
  musicCardRound: { borderRadius: 999 },
  musicCardTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  musicCardSub: { color: '#737373', fontSize: 11, marginTop: 3 },

  emptyState: { alignItems: 'center', paddingTop: 64 },
  emptyText: { color: '#737373', fontSize: 14, fontWeight: '600', marginTop: 12 },

  toast: {
    position: 'absolute', bottom: 80, left: 24, right: 24,
    backgroundColor: '#1db954', borderRadius: 12, padding: 14,
    alignItems: 'center', elevation: 8,
  },
  toastText: { color: '#000', fontWeight: '800', fontSize: 14 },

  modal: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#282828', borderRadius: 20, padding: 20,
    width: '85%', maxHeight: '60%',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalItem: {
    paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalItemText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalItemSub: { color: '#737373', fontSize: 11, marginTop: 2 },
  modalCancel: { marginTop: 16, alignItems: 'center' },
});
