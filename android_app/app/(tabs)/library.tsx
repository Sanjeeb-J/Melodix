import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, RefreshControl, TextInput, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { getPlaylists, createPlaylist, deletePlaylist } from '../../services/playlistService';
import { getPlaylistGradientColors } from '../../utils/playlistCover';

export default function LibraryScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchPlaylists = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (err) {
      if (err.status === 401) { logout(); router.replace('/auth'); }
    } finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { fetchPlaylists(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createPlaylist(newName.trim());
      await fetchPlaylists();
      setShowCreate(false);
      setNewName('');
      showToast('Playlist created!');
    } catch { showToast('Failed to create playlist'); }
    finally { setCreating(false); }
  };

  const handleDelete = (p) => {
    Alert.alert('Delete Playlist', `Delete "${p.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deletePlaylist(p._id);
            setPlaylists((prev) => prev.filter((x) => x._id !== p._id));
            showToast('Playlist deleted');
          } catch { showToast('Failed to delete'); }
        },
      },
    ]);
  };

  const filtered = playlists.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#1db954" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color="#737373" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search playlists..."
          placeholderTextColor="#737373"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color="#737373" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlaylists(); }} tintColor="#1db954" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="library-music" size={56} color="#383838" />
            <Text style={styles.emptyTitle}>
              {search ? `No playlists match "${search}"` : 'No playlists yet'}
            </Text>
            {!search && (
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.createBtnText}>Create Playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item: p }) => {
          const colors = getPlaylistGradientColors(p._id);
          return (
            <TouchableOpacity
              style={styles.playlistRow}
              onPress={() => router.push(`/playlist/${p._id}`)}
              onLongPress={() => handleDelete(p)}
              activeOpacity={0.8}
            >
              {p.songs?.length > 0 ? (
                <Image source={{ uri: p.songs[0].thumbnail }} style={styles.rowThumb} />
              ) : (
                <LinearGradient colors={colors} style={[styles.rowThumb, styles.thumbCenter]}>
                  <MaterialIcons name="library-music" size={20} color="rgba(255,255,255,0.6)" />
                </LinearGradient>
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.rowSubs}>Playlist · {p.songs?.length || 0} songs</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#383838" />
            </TouchableOpacity>
          );
        }}
      />

      {/* Toast */}
      {toast ? (
        <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>
      ) : null}

      {/* Create Playlist Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name..."
              placeholderTextColor="#737373"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreate(false); setNewName(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate} disabled={creating || !newName.trim()}>
                {creating
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.confirmText}>Create</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 16, marginBottom: 8,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  playlistRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowThumb: { width: 52, height: 52, borderRadius: 6 },
  thumbCenter: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rowSubs: { color: '#737373', fontSize: 12, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingTop: 64 },
  emptyTitle: { color: '#737373', fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 20, textAlign: 'center' },
  createBtn: { backgroundColor: '#1db954', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  createBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

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
    fontSize: 15, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#1db954', alignItems: 'center' },
  confirmText: { color: '#000', fontWeight: '800' },
});
