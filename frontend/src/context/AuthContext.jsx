import { createContext, useState } from "react";

export const AuthContext = createContext();
const LEGACY_PLAYLIST_CACHE_KEY = "melodix_playlists_cache";

const clearPlaylistCaches = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (
        key === LEGACY_PLAYLIST_CACHE_KEY ||
        key.startsWith(`${LEGACY_PLAYLIST_CACHE_KEY}:`)
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore storage cleanup failures.
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const login = (newToken) => {
    clearPlaylistCaches();
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    clearPlaylistCaches();
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
