import { useEffect, useState } from "react";
import { getProfile } from "../services/userService";

export default function Profile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <div className="page-stack">
      <h1 className="page-title">{profile?.displayName || profile?.name || "Profile"}</h1>
      <div className="stats-grid">
        <div><strong>{profile?.playlistCount || 0}</strong><span>Playlists</span></div>
        <div><strong>{profile?.totalPlays || 0}</strong><span>Total plays</span></div>
        <div><strong>{profile?.totalMinutes || 0}</strong><span>Minutes</span></div>
      </div>
      <p className="muted">{profile?.email}</p>
    </div>
  );
}
