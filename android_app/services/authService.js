import { apiRequest } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = '/api/auth';

export const loginUser = async (userData) =>
  apiRequest(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

export const registerUser = async (userData) =>
  apiRequest(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

export const forgotPassword = async (email, newPassword) =>
  apiRequest(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword }),
  });

export const saveToken = async (token) => AsyncStorage.setItem('melodix_token', token);
export const removeToken = async () => AsyncStorage.removeItem('melodix_token');
export const getToken = async () => AsyncStorage.getItem('melodix_token');
