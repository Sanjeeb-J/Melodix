import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import {
  getPlaylists, deleteSong, updateSong, updatePlaylist, deletePlaylist,
} from '../../services/playlistService';
import { getPlaylistGradientColors } from '../../utils/playlistCover';
import { fmtTime } from '../../context/PlayerContext';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Edit song modal
  const [editSong, setEditSong] = useState(null);
  const [editName, setEditName] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [saving, setSaving] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchPlaylist = useCallback(async () => {
    try {
      const all = await getPlaylists();
      const found = all.find((p) => p._id === id);
      if (found) { setPlaylist(found); setNameInput(found.name); }
    } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchPlaylist(); }, []);

  if (loading || !playlist) {
    return <View style={styles.loading}><ActivityIndicator color="#1db954" size="large" /></View>;
  }

  const filteredSongs = (playlist.songs || []).filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.artist && s.artist.toLowerCase().includes(search.toLowerCase()))
  );

  const colors = getPlaylistGradientColors(playlist._id);
  const cover = playlist.songs?.[0]?.thumbnail;

  const handlePlay = (song, idx) => {
    if (currentSong?.youtubeId === song.youtubeId && isPlaying) {
      togglePlay();
    } else {
      playSong(song, filteredSongs, idx);
    }
  };

  const handlePlayAll = () => {
    if (!filteredSongs.length) return;
    playSong(filteredSongs[0], filteredSongs, 0);
  };

  const handleRename = async () => {
    if (!nameInput.trim()) return;
    try {
      await updatePlaylist(playlist._id, nameInput.trim());
      setPlaylist({ ...playlist, name: nameInput.trim() });
      showToast('Renamed!');
    } catch { showToast('Rename failed'); }
    setEditingName(false);
  };

  const handleDeleteSong = async (songId) => {
    try {
      await deleteSong(playlist._id, songId);
      setPlaylist({ ...playlist, songs: playlist.songs.filter((s) => s._id !== songId) });
      showToast('Song removed');
    } catch { showToast('Failed to remove'); }
  };

  const handleSaveEdit = async () => {
    if (!editSong || !editName.trim()) return;
    setSaving(true);
    try {
      await updateSong(playlist._id, editSong._id, { name: editName.trim(), artist: editArtist.trim() });
      setPlaylist({
        ...playlist,
        songs: playlist.songs.map((s) =>
          s._id === editSong._id ? { ...s, name: editName.trim(), artist: editArtist.trim() } : s
        ),
      });
      showToast('Song updated!');
      setEditSong(null);
    } catch { showToast('Update failed'); }
    finally { setSaving(false); }
  };

  const handleDeletePlaylist = () => {
    Alert.alert('Delete Playlist', `Delete "${playlist.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deletePlaylist(playlist._id);
            router.back();
          } catch { showToast('Failed to delete playlist'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredSongs}
        keyExtractor={(s) => s._id}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <>
            {/* Hero cover */}
            <LinearGradient colors={[colors[0] + 'cc', '#000']} style={styles.hero}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.coverImg} />
              ) : (
                <LinearGradient colors={colors} style={[styles.coverImg, styles.coverCenter]}>
                  <MaterialIcons name="library-music" size={56} color="rgba(255,255,255,0.6)" />
                </LinearGradient>
              )}
            </LinearGradient>

            {/* Info */}
            <View style={styles.info}>
              {editingName ? (
                <View style={styles.renameRow}>
                  <TextInput
                    style={styles.renameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleRename}>
                    <MaterialIcons name="check" size={24} color="#1db954" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingName(false)}>
                    <MaterialIcons name="close" size={24} color="#737373" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <Text style={styles.playlistName} numberOfLines={2}>{playlist.name}</Text>
                  <TouchableOpacity onPress={() => setEditingName(true)}>
                    <MaterialIcons name="edit" size={18} color="#737373" />
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.playlistMeta}>{playlist.songs?.length || 0} songs</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll}>
                  <MaterialIcons name="play-arrow" size={24} color="#000" />
                  <Text style={styles.playAllText}>Play All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deletePlaylistBtn} onPress={handleDeletePlaylist}>
                  <MaterialIcons name="delete-outline" size={22} color="#f87171" />
                </TouchableOpacity>
              </View>

              {/* Search */}
              {playlist.songs?.length > 0 && (
                <View style={styles.searchBox}>
                  <MaterialIcons name="search" size={16} color="#737373" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search songs..."
                    placeholderTextColor="#737373"
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="music-off" size={48} color="#383838" />
            <Text style={styles.emptyText}>
              {search ? 'No songs match your search' : 'No songs yet — search to add some!'}
            </Text>
          </View>
        }
        renderItem={({ item: song, index }) => {
          const isCurrent = currentSong?.youtubeId === song.youtubeId;
          return (
            <TouchableOpacity
              style={styles.songRow}
              onPress={() => handlePlay(song, index)}
              activeOpacity={0.7}
            >
              <View style={styles.songIndex}>
                {isCurrent
                  ? <MaterialIcons name={isPlaying ? 'equalizer' : 'pause'} size={16} color="#1db954" />
                  : <Text style={styles.indexText}>{index + 1}</Text>
                }
              </View>
              <Image source={{ uri: song.thumbnail }} style={styles.thumb} />
              <View style={styles.songInfo}>
                <Text style={[styles.songTitle, isCurrent && styles.activeSong]} numberOfLines={1}>{song.name}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
              </View>
              <Text style={styles.songDuration}>{song.duration || ''}</Text>
              <View style={styles.songActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => { setEditSong(song); setEditName(song.name); setEditArtist(song.artist || ''); }}
                >
                  <MaterialIcons name="edit" size={18} color="#737373" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => {
                    Alert.alert('Remove Song', `Remove "${song.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => handleDeleteSong(song._id) },
                    ]);
                  }}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#737373" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Toast */}
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}

      {/* Edit Song Modal */}
      <Modal visible={!!editSong} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Song</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Song name"
              placeholderTextColor="#737373"
            />
            <TextInput
              style={styles.modalInput}
              value={editArtist}
              onChangeText={setEditArtist}
              placeholder="Artist"
              placeholderTextColor="#737373"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditSong(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveEdit} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.confirmText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  hero: { paddingTop: 52, paddingBottom: 20, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginLeft: 16, marginBottom: 16, padding: 4 },
  coverImg: { width: 180, height: 180, borderRadius: 12 },
  coverCenter: { alignItems: 'center', justifyContent: 'center' },

  info: { padding: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  playlistName: { flex: 1, color: '#fff', fontSize: 24, fontWeight: '900' },
  playlistMeta: { color: '#737373', fontSize: 13, marginBottom: 16 },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  renameInput: {
    flex: 1, color: '#fff', fontSize: 20, fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  playAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1db954', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24, flex: 1, justifyContent: 'center',
  },
  playAllText: { color: '#000', fontWeight: '800', fontSize: 15 },
  deletePlaylistBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)', alignItems: 'center', justifyContent: 'center',
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  songRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  songIndex: { width: 20, alignItems: 'center' },
  indexText: { color: '#737373', fontSize: 12 },
  thumb: { width: 44, height: 44, borderRadius: 4 },
  songInfo: { flex: 1 },
  songTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  activeSong: { color: '#1db954' },
  songArtist: { color: '#737373', fontSize: 12, marginTop: 2 },
  songDuration: { color: '#737373', fontSize: 11, fontFamily: 'monospace' },
  songActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },

  emptyState: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: '#737373', fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 },

  toast: {
    position: 'absolute', bottom: 80, left: 24, right: 24,
    backgroundColor: '#1db954', borderRadius: 12, padding: 14,
    alignItems: 'center', elevation: 8,
  },
  toastText: { color: '#000', fontWeight: '800', fontSize: 14 },

  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#282828', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#1db954', alignItems: 'center' },
  confirmText: { color: '#000', fontWeight: '800' },
});
