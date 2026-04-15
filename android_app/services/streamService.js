import { API_BASE_URL } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For audio streaming: returns the stream URL for a YouTube video ID
export const getStreamUrl = (videoId) => {
  return `${API_BASE_URL}/api/stream/${videoId}`;
};

export const getStreamSource = async (videoId) => {
  const token = await AsyncStorage.getItem('melodix_token');
  const baseUrl = getStreamUrl(videoId);

  if (Platform.OS === 'web') {
    if (!token) console.warn('[Stream] No token found in AsyncStorage. Stream request might fail auth.');
    return {
      uri: token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl,
    };
  }

  const source = { uri: baseUrl };

  if (token) {
    source.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  return source;
};
