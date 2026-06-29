import { Outlet } from "react-router-dom";
import { useState } from "react";
import NowPlayingBar from "./NowPlayingBar";
import QueueSidebar from "./QueueSidebar";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function RootLayout() {
  const [queueOpen, setQueueOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="spotify-shell">
      <Sidebar />
      <main className="spotify-main">
        <TopBar searchValue={searchValue} onSearchChange={setSearchValue} />
        <div className="page-scroll">
          <Outlet context={{ searchValue, setSearchValue }} />
        </div>
      </main>
      <QueueSidebar open={queueOpen} onClose={() => setQueueOpen(false)} />
      <NowPlayingBar onToggleQueue={() => setQueueOpen((value) => !value)} />
    </div>
  );
}
