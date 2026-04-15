// ─── API Service ───────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = rawApiBaseUrl ? rawApiBaseUrl.replace(/\/+$/, '') : '';

export const getApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const apiRequest = async (path, options = {}) => {
  const url = getApiUrl(path);
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Network error - the Melodix API is unavailable right now.');
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return payload;
};

export const getToken = async () => AsyncStorage.getItem('melodix_token');
