import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import CategoryGrid from "../components/search/CategoryGrid";
import TrackRow from "../components/search/TrackRow";
import { useDebounce } from "../hooks/useDebounce";
import { useLiked } from "../hooks/useLiked";
import { usePlayer } from "../context/PlayerContext";
import { apiRequest } from "../services/api";
import { logSearch } from "../services/searchLogService";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export default function Search() {
  const { searchValue, setSearchValue } = useOutletContext();
  const debounced = useDebounce(searchValue, 500);
  const player = usePlayer();
  const { likedSongs, toggleLike } = useLiked();
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [activeType, setActiveType] = useState("song");

  useEffect(() => {
    apiRequest("/api/youtube/categories", { headers: authHeaders() }).then((data) => setCategories(data.categories || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }

    const path = `/api/youtube/search?q=${encodeURIComponent(debounced)}&type=${activeType}`;
    apiRequest(path, { headers: authHeaders() })
      .then((data) => setResults(Array.isArray(data) ? data : data.items || []))
      .catch(() => setResults([]));
    logSearch(debounced).catch(() => {});
  }, [debounced, activeType]);

  const play = (song, index) => player.playSong(song, results, index);
  const isLiked = (song) => likedSongs.some((item) => item.videoId === (song.videoId || song.youtubeId));

  if (!searchValue.trim()) {
    return (
      <div className="page-stack">
        <h1 className="page-title">Search</h1>
        <h2 className="section-title">Browse all categories</h2>
        <CategoryGrid categories={categories} onSelect={(category) => setSearchValue(category.name)} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="filter-pills">
        {["song", "album", "artist", "playlist"].map((type) => (
          <button key={type} className={activeType === type ? "active" : ""} onClick={() => setActiveType(type)}>
            {type[0].toUpperCase() + type.slice(1)}s
          </button>
        ))}
      </div>
      <div className="track-list">
        {results.map((song, index) => (
          <TrackRow
            key={song.videoId || song.playlistId || song.browseId || index}
            song={song}
            index={index}
            liked={isLiked(song)}
            onPlay={() => play(song, index)}
            onLike={() => toggleLike(song)}
          />
        ))}
      </div>
    </div>
  );
}
