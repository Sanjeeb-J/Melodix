import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Image, ActivityIndicator, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { getPlaylists, markPlaylistPlayed } from '../../services/playlistService';
import { getPlaylistGradientColors } from '../../utils/playlistCover';

export default function HomeScreen() {
  const router = useRouter();
  const { token, logout, isLoading: authLoading } = useAuth();
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 17 ? 'Good afternoon' :
    hour >= 17 && hour < 21 ? 'Good evening' : 'Good night';

  const fetchPlaylists = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (err) {
      if (err.status === 401) { logout(); router.replace('/auth'); }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !token) { router.replace('/auth'); return; }
    if (token) fetchPlaylists();
  }, [token, authLoading]);

  const handleRefresh = () => { setRefreshing(true); fetchPlaylists(); };

  const handlePlaylistPress = (p) => router.push(`/playlist/${p._id}`);

  const handlePlayAll = async (p) => {
    if (!p.songs?.length) return;
    playSong(p.songs[0], p.songs, 0);
    await markPlaylistPlayed(p._id);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1db954" size="large" />
      </View>
    );
  }

  const quickAccess = playlists.slice(0, 6);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1db954" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.headerTitle}>Melodix</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { logout(); router.replace('/auth'); }}
        >
          <MaterialIcons name="logout" size={22} color="#737373" />
        </TouchableOpacity>
      </View>

      {/* Quick Access Grid */}
      {quickAccess.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <View style={styles.quickGrid}>
            {quickAccess.map((p) => {
              const colors = getPlaylistGradientColors(p._id);
              return (
                <TouchableOpacity
                  key={p._id}
                  style={styles.quickCard}
                  onPress={() => handlePlaylistPress(p)}
                  activeOpacity={0.8}
                >
                  {p.songs?.length > 0 ? (
                    <Image source={{ uri: p.songs[0].thumbnail }} style={styles.quickThumb} />
                  ) : (
                    <LinearGradient colors={colors} style={styles.quickThumb}>
                      <MaterialIcons name="library-music" size={20} color="rgba(255,255,255,0.6)" />
                    </LinearGradient>
                  )}
                  <View style={styles.quickInfo}>
                    <Text style={styles.quickName} numberOfLines={1}>{p.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quickPlayBtn}
                    onPress={() => handlePlayAll(p)}
                  >
                    <MaterialIcons name="play-arrow" size={20} color="#000" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* All Playlists */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Your Playlists</Text>
        <TouchableOpacity onPress={() => router.push('/library')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {playlists.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="library-music" size={56} color="#383838" />
          <Text style={styles.emptyTitle}>No playlists yet</Text>
          <Text style={styles.emptySubtitle}>Create your first playlist to get started</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/library')}>
            <Text style={styles.createBtnText}>Go to Library</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.playlistGrid}>
          {playlists.slice(0, 8).map((p) => {
            const colors = getPlaylistGradientColors(p._id);
            return (
              <TouchableOpacity
                key={p._id}
                style={styles.playlistCard}
                onPress={() => handlePlaylistPress(p)}
                activeOpacity={0.8}
              >
                <View style={styles.cardCoverWrapper}>
                  {p.songs?.length > 0 ? (
                    <Image source={{ uri: p.songs[0].thumbnail }} style={styles.cardCover} />
                  ) : (
                    <LinearGradient colors={colors} style={styles.cardCover}>
                      <MaterialIcons name="library-music" size={28} color="rgba(255,255,255,0.6)" />
                    </LinearGradient>
                  )}
                  <TouchableOpacity
                    style={styles.cardPlayBtn}
                    onPress={() => handlePlayAll(p)}
                  >
                    <MaterialIcons name="play-arrow" size={20} color="#000" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.cardSubs}>{p.songs?.length || 0} songs</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, paddingBottom: 120 },
  loadingContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 12 },
  greeting: { color: '#737373', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seeAll: { color: '#737373', fontSize: 12, fontWeight: '700' },

  // Quick Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  quickCard: {
    width: '48%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden',
  },
  quickThumb: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  quickInfo: { flex: 1, paddingHorizontal: 8 },
  quickName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  quickPlayBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#1db954',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },

  // Playlist grid
  playlistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  playlistCard: { width: '47%' },
  cardCoverWrapper: { position: 'relative', marginBottom: 8 },
  cardCover: {
    width: '100%', aspectRatio: 1, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  cardPlayBtn: {
    position: 'absolute', bottom: 8, right: 8,
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1db954',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  cardName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cardSubs: { color: '#737373', fontSize: 11, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  emptySubtitle: { color: '#737373', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  createBtn: { backgroundColor: '#1db954', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  createBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
