import { ChevronLeft, ChevronRight, Search, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TopBar({ searchValue = "", onSearchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSearch = location.pathname === "/search";

  return (
    <header className="top-bar">
      <div className="history-buttons">
        <button className="icon-button" onClick={() => navigate(-1)}><ChevronLeft size={22} /></button>
        <button className="icon-button" onClick={() => navigate(1)}><ChevronRight size={22} /></button>
      </div>
      {isSearch && (
        <label className="top-search">
          <Search size={18} />
          <input value={searchValue} onChange={(event) => onSearchChange?.(event.target.value)} placeholder="What do you want to listen to?" />
        </label>
      )}
      <button className="profile-pill" onClick={() => navigate("/profile")}><User size={18} /> Profile</button>
    </header>
  );
}
