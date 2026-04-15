import { API_BASE_URL } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For audio streaming: returns the stream URL for a YouTube video ID
export const getStreamUrl = async (videoId) => {
  const token = await AsyncStorage.getItem('melodix_token');
  return `${API_BASE_URL}/api/stream/${videoId}?token=${token}`;
};
