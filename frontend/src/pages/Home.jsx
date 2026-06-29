import { useEffect, useState } from "react";
import GreetingHeader from "../components/home/GreetingHeader";
import SectionRow from "../components/home/SectionRow";
import TrackRow from "../components/search/TrackRow";
import Spinner from "../components/shared/Spinner";
import { usePlayer } from "../context/PlayerContext";
import { useLiked } from "../hooks/useLiked";
import { getHistory } from "../services/historyService";
import { getPlaylists } from "../services/playlistService";
import { getRecommendations } from "../services/recommendService";
import { apiRequest } from "../services/api";

export default function Home() {
  const player = usePlayer();
  const { likedSongs, toggleLike } = useLiked();
  const [state, setState] = useState({ loading: true, history: [], recommendations: [], playlists: [], trending: [] });

  useEffect(() => {
    Promise.allSettled([
      getHistory(6),
      getRecommendations(),
      getPlaylists({ forceRefresh: true }),
      apiRequest("/api/youtube/trending", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
    ]).then(([history, recommendations, playlists, trending]) => {
      setState({
        loading: false,
        history: history.value || [],
        recommendations: recommendations.value?.items || [],
        playlists: playlists.value || [],
        trending: trending.value?.items || [],
      });
    });
  }, []);

  const playSongs = (songs, index = 0) => {
    const song = songs[index];
    if (song) player.playSong(song, songs, index);
  };
  const isLiked = (song) => likedSongs.some((item) => item.videoId === (song.videoId || song.youtubeId));

  if (state.loading) return <Spinner />;

  return (
    <div className="page-stack">
      <GreetingHeader name="Sanju" />
      {state.history.length > 0 && (
        <section className="quick-grid">
          {state.history.slice(0, 6).map((song, index) => (
            <TrackRow
              key={`${song.videoId}-${index}`}
              song={song}
              index={index}
              liked={isLiked(song)}
              onPlay={() => playSongs(state.history, index)}
              onLike={() => toggleLike(song)}
            />
          ))}
        </section>
      )}
      <SectionRow title="Made for you" items={state.recommendations} onPlay={(song) => player.playSong(song, state.recommendations, state.recommendations.indexOf(song))} />
      <SectionRow title="Your playlists" items={state.playlists} />
      <SectionRow title="Trending" items={state.trending} onPlay={(song) => player.playSong(song, state.trending, state.trending.indexOf(song))} />
    </div>
  );
}
