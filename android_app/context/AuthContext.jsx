import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('melodix_token').then((t) => {
      setToken(t);
      setIsLoading(false);
    });
  }, []);

  const login = async (newToken) => {
    await AsyncStorage.setItem('melodix_token', newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('melodix_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
