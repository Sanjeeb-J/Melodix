import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./components/ToastContainer";
import RootLayout from "./components/layout/RootLayout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Playlist from "./pages/Playlist";
import LikedSongs from "./pages/LikedSongs";
import Artist from "./pages/Artist";
import Album from "./pages/Album";
import Profile from "./pages/Profile";

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="search" element={<Search />} />
          <Route path="library" element={<Library />} />
          <Route path="playlist/:id" element={<Playlist />} />
          <Route path="liked" element={<LikedSongs />} />
          <Route path="artist/:channelId" element={<Artist />} />
          <Route path="album/:playlistId" element={<Album />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
