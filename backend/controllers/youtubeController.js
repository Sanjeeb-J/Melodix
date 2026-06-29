const axios = require("axios");
const { Innertube } = require("youtubei.js");
const { getCached, setCached, getCacheStats } = require("../utils/searchCache");

let youtubeClientPromise = null;
let youtubeMusicClientPromise = null;

const BLACKLIST = [
  "interview",
  "podcast",
  "reaction",
  "review",
  "analysis",
  "trailer",
  "teaser",
  "explanation",
  "news",
  "case",
  "arrest",
  "arrested",
  "mla",
  "court",
  "crime",
  "police",
  "exclusive",
  "reporter",
  "debate",
  "breaking",
  "politics",
  "geopolitics",
  "documentary",
  "vlog",
  "comedy",
  "sketch",
  "prank",
  "challenge",
  "gaming",
  "walkthrough",
  "speedrun",
  "mod showcase",
  "gameplay",
  "stream highlights",
  "tv",
];

const MIN_DURATION_SECONDS = 60;
const MAX_DURATION_SECONDS = 600;

const CATEGORY_PRESETS = [
  { id: "pop", name: "Pop", color: "#8D67AB", query: "popular pop songs" },
  { id: "hip-hop", name: "Hip-Hop", color: "#BA5D07", query: "hip hop songs" },
  { id: "rock", name: "Rock", color: "#E8115B", query: "rock songs" },
  { id: "electronic", name: "Electronic", color: "#148A08", query: "electronic music" },
  { id: "jazz", name: "Jazz", color: "#477D95", query: "jazz music" },
  { id: "classical", name: "Classical", color: "#7D4B32", query: "classical music" },
  { id: "indie", name: "Indie", color: "#537AA1", query: "indie songs" },
  { id: "rnb", name: "R&B", color: "#B49BC8", query: "rnb songs" },
  { id: "lo-fi", name: "Lo-Fi", color: "#777777", query: "lofi beats" },
  { id: "k-pop", name: "K-Pop", color: "#DC148C", query: "kpop songs" },
  { id: "country", name: "Country", color: "#A56752", query: "country songs" },
  { id: "metal", name: "Metal", color: "#503750", query: "metal songs" },
  { id: "anime", name: "Anime", color: "#AF2896", query: "anime openings" },
  { id: "gaming", name: "Gaming", color: "#0D73EC", query: "gaming music" },
  { id: "workout", name: "Workout", color: "#E13300", query: "workout music" },
  { id: "sleep", name: "Sleep", color: "#1E3264", query: "sleep music" },
  { id: "chill", name: "Chill", color: "#27856A", query: "chill songs" },
  { id: "party", name: "Party", color: "#D84000", query: "party songs" },
];

const formatDuration = (iso) => {
  if (!iso) return "--:--";

  const hours = Number(iso.match(/(\d+)H/)?.[1] || 0);
  const minutes = Number(iso.match(/(\d+)M/)?.[1] || 0);
  const seconds = Number(iso.match(/(\d+)S/)?.[1] || 0);
  const totalMinutes = hours * 60 + minutes;

  return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
};

const durationToSeconds = (duration = "") => {
  const parts = String(duration).split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

const getText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.runs)) {
    return value.runs.map((item) => item?.text || "").join("");
  }

  const stringified = String(value);
  return stringified === "[object Object]" ? "" : stringified;
};

const getThumbnailUrl = (thumbnails) => {
  if (!thumbnails) return "";
  if (Array.isArray(thumbnails)) {
    return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || "";
  }

  if (Array.isArray(thumbnails.contents)) {
    return getThumbnailUrl(thumbnails.contents);
  }

  return thumbnails.url || "";
};

const mapTrack = (track, fallbackArtist = "Unknown") => {
  const videoId = track?.id || track?.videoId || "";
  const title = getText(track?.title);

  if (!videoId || !title) return null;

  return {
    title,
    artist:
      track?.author?.name ||
      track?.artists?.[0]?.name ||
      track?.subtitle?.text ||
      fallbackArtist,
    thumbnail:
      getThumbnailUrl(track?.thumbnail?.contents || track?.thumbnail) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    videoId,
    youtubeLink: `https://www.youtube.com/watch?v=${videoId}`,
    duration:
      typeof track?.duration?.seconds === "number"
        ? `${Math.floor(track.duration.seconds / 60)}:${String(track.duration.seconds % 60).padStart(2, "0")}`
        : track?.duration?.text || "--:--",
  };
};

const getYouTube = async () => {
  if (!youtubeClientPromise) {
    youtubeClientPromise = Innertube.create();
  }

  return youtubeClientPromise;
};

const getYouTubeMusic = async () => {
  if (!youtubeMusicClientPromise) {
    youtubeMusicClientPromise = Innertube.create({ client_type: "WEB_REMIX" });
  }

  return youtubeMusicClientPromise;
};

const getDurationDetails = async (videoIds) => {
  const durationMap = {};
  const ids = videoIds.filter(Boolean);
  if (!ids.length) return durationMap;

  for (let i = 0; i < ids.length; i += 50) {
    const videoResponse = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "contentDetails,snippet",
        id: ids.slice(i, i + 50).join(","),
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    for (const item of videoResponse.data.items || []) {
      durationMap[item.id] = {
        text: formatDuration(item.contentDetails?.duration),
        seconds: Number(item.contentDetails?.duration?.match(/(\d+)M/)?.[1] || 0) * 60 +
          Number(item.contentDetails?.duration?.match(/(\d+)S/)?.[1] || 0) +
          Number(item.contentDetails?.duration?.match(/(\d+)H/)?.[1] || 0) * 3600,
        title: item.snippet?.title,
        artist: item.snippet?.channelTitle,
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
      };
    }
  }

  return durationMap;
};

const searchYouTubeVideos = async (query, maxResults = 12) => {
  const searchResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
    params: {
      part: "snippet",
      q: query,
      type: "video",
      videoCategoryId: "10",
      maxResults,
      key: process.env.YOUTUBE_API_KEY,
    },
  });

  const items = searchResponse.data.items || [];
  const durationMap = await getDurationDetails(items.map((item) => item.id?.videoId));

  return items
    .map((item) => {
      const videoId = item.id?.videoId;
      const details = durationMap[videoId] || {};
      return {
        type: "song",
        title: item.snippet?.title || details.title || "Untitled",
        artist: item.snippet?.channelTitle || details.artist || "YouTube Music",
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || details.thumbnail || "",
        videoId,
        youtubeLink: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
        duration: details.text || "--:--",
        durationSeconds: details.seconds || 0,
      };
    })
    .filter((item) => item.videoId)
    .filter((item) => !item.durationSeconds || (item.durationSeconds >= MIN_DURATION_SECONDS && item.durationSeconds <= MAX_DURATION_SECONDS))
    .filter((item) => {
      const haystack = `${item.title} ${item.artist}`.toLowerCase();
      return !BLACKLIST.some((keyword) => haystack.includes(keyword));
    });
};

const searchYouTube = async (req, res) => {
  try {
    const query = req.query.query || req.query.q;
    const type = req.query.type || "song";

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    if (type !== "song") {
      req.query.type = type === "playlist" ? "playlists" : `${type}s`;
      return searchMusic(req, res);
    }

    const cached = getCached(query);
    if (cached) {
      console.log(`[YouTube Cache HIT] "${query}" — served from cache | Cache size: ${getCacheStats().size}`);
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    console.log(`[YouTube Cache MISS] "${query}" — calling YouTube API`);
    res.setHeader("X-Cache", "MISS");

    const results = (await searchYouTubeVideos(query, 10))
      .sort((a, b) => {
        const aTopic = a.artist.includes("- Topic");
        const bTopic = b.artist.includes("- Topic");
        if (aTopic === bTopic) return 0;
        return aTopic ? -1 : 1;
      });

    setCached(query, results);
    console.log(`[YouTube Cache] Cached "${query}" | Cache size now: ${getCacheStats().size}`);

    return res.json(results);
  } catch (error) {
    console.error("[YouTube] Search error:", error?.response?.data || error.message);
    return res.status(500).json({ message: "YouTube search failed" });
  }
};

const searchMusic = async (req, res) => {
  try {
    const { query, type = "playlists", limit = "20" } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    if (!["playlists", "albums", "artists"].includes(type)) {
      return res.status(400).json({ message: "Invalid search type" });
    }

    const yt = await getYouTubeMusic();
    const musicType = type === "playlists" ? "playlist" : type === "albums" ? "album" : "artist";
    const raw = await yt.music.search(query, { type: musicType });
    const items =
      raw?.contents?.flatMap((section) => section?.contents || section?.items || []) ||
      raw?.items ||
      [];

    const results = [];

    for (const item of items) {
      if (results.length >= Number(limit)) break;
      if (!item) continue;

      if (type === "playlists") {
        const rawId = item.id || item.playlist_id || "";
        const playlistId = rawId.startsWith("VL") ? rawId.slice(2) : rawId;
        if (!playlistId) continue;

        results.push({
          type: "playlist",
          playlistId,
          title: getText(item.title) || "Unknown Playlist",
          author: item.author?.name || item.authors?.[0]?.name || getText(item.subtitle) || "Unknown",
          thumbnail: getThumbnailUrl(item.thumbnail?.contents || item.thumbnail),
          trackCount: item.item_count ? Number.parseInt(item.item_count, 10) : undefined,
        });
        continue;
      }

      if (type === "albums") {
        const browseId = item.id || "";
        if (!browseId) continue;

        results.push({
          type: "album",
          browseId,
          title: getText(item.title) || "Unknown Album",
          artist: item.author?.name || item.authors?.[0]?.name || getText(item.subtitle) || "Unknown",
          thumbnail: getThumbnailUrl(item.thumbnail?.contents || item.thumbnail),
          year: item.year || undefined,
        });
        continue;
      }

      const browseId = item.id || "";
      if (!browseId) continue;

      results.push({
        type: "artist",
        browseId,
        name: item.name || getText(item.title) || "Unknown Artist",
        thumbnail: getThumbnailUrl(item.thumbnail?.contents || item.thumbnail),
        subscribers: item.subscribers?.text || undefined,
      });
    }

    return res.json(results);
  } catch (error) {
    console.error("[YouTube Music] Search error:", error?.message || error);
    return res.status(500).json({ message: "YouTube Music search failed" });
  }
};

const getTrending = async (req, res) => {
  try {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet,contentDetails,statistics",
        chart: "mostPopular",
        videoCategoryId: "10",
        regionCode: req.query.region || "IN",
        maxResults: Math.min(Number(req.query.limit || 20), 50),
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    const items = (response.data.items || [])
      .map((item) => ({
        type: "song",
        videoId: item.id,
        title: item.snippet?.title || "Untitled",
        artist: item.snippet?.channelTitle || "YouTube Music",
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        duration: formatDuration(item.contentDetails?.duration),
        durationSeconds: durationToSeconds(formatDuration(item.contentDetails?.duration)),
        youtubeLink: `https://www.youtube.com/watch?v=${item.id}`,
        views: Number(item.statistics?.viewCount || 0),
      }))
      .filter((item) => item.videoId);

    return res.json({ items });
  } catch (error) {
    console.error("[YouTube] Trending error:", error?.response?.data || error.message);
    return res.status(500).json({ message: "Failed to load trending music" });
  }
};

const getCategories = async (req, res) => {
  const categories = CATEGORY_PRESETS.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    thumbnail: "",
  }));
  res.json({ categories });
};

const getCategorySongs = async (req, res) => {
  try {
    const category = CATEGORY_PRESETS.find((item) => item.id === req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const items = await searchYouTubeVideos(category.query, Math.min(Number(req.query.limit || 24), 50));
    res.json({ category: { id: category.id, name: category.name, color: category.color }, items });
  } catch (error) {
    console.error("[YouTube] Category error:", error?.response?.data || error.message);
    return res.status(500).json({ message: "Failed to load category" });
  }
};

const getPlaylistTracks = async (req, res) => {
  try {
    const yt = await getYouTubeMusic();
    const playlist = await yt.music.getPlaylist(req.params.playlistId);
    const tracks = (playlist?.items || []).map((item) => mapTrack(item)).filter(Boolean);
    return res.json({ tracks });
  } catch (error) {
    console.error("[YouTube Music] Playlist fetch error:", error?.message || error);
    return res.status(500).json({ message: "Failed to load playlist" });
  }
};

const getAlbumTracks = async (req, res) => {
  try {
    const yt = await getYouTubeMusic();
    const album = await yt.music.getAlbum(req.params.browseId);

    const title = getText(album?.header?.title) || "Unknown Album";
    const artist = getText(album?.header?.strapline_text_one) || "Unknown Artist";
    const thumbnail = getThumbnailUrl(album?.header?.thumbnail?.contents || album?.header?.thumbnail);
    const subtitle = getText(album?.header?.subtitle);
    const year = subtitle.match(/\b(19|20)\d{2}\b/)?.[0];
    const tracks = (album?.contents || []).map((item) => mapTrack(item, artist)).filter(Boolean);

    return res.json({ title, artist, thumbnail, year, tracks, songs: tracks });
  } catch (error) {
    console.error("[YouTube Music] Album fetch error:", error?.message || error);
    return res.status(500).json({ message: "Failed to load album" });
  }
};

const getArtistTracks = async (req, res) => {
  try {
    const yt = await getYouTubeMusic();
    const artistPage = await yt.music.getArtist(req.params.browseId);

    const name = getText(artistPage?.header?.title) || "Unknown Artist";
    const thumbnail = getThumbnailUrl(artistPage?.header?.thumbnail?.contents || artistPage?.header?.thumbnail);
    const subscribers = artistPage?.header?.subscribers?.text || undefined;

    let sourceItems = [];

    try {
      const shelf = await artistPage.getAllSongs();
      sourceItems = shelf?.contents || [];
    } catch (error) {
      const songsSection = artistPage?.sections?.find((section) => {
        const title = getText(section?.title).toLowerCase();
        return title.includes("song") || section?.contents?.[0]?.id;
      });
      sourceItems = songsSection?.contents || artistPage?.sections?.[0]?.contents || [];
    }

    const tracks = sourceItems.map((item) => mapTrack(item, name)).filter(Boolean);

    return res.json({
      name,
      description: subscribers || "",
      thumbnail,
      banner: thumbnail,
      subscribers,
      tracks,
      popularSongs: tracks.slice(0, 10),
      albums: [],
    });
  } catch (error) {
    console.error("[YouTube Music] Artist fetch error:", error?.message || error);
    return res.status(500).json({ message: "Failed to load artist" });
  }
};

module.exports = {
  searchYouTube,
  searchMusic,
  getTrending,
  getCategories,
  getCategorySongs,
  getPlaylistTracks,
  getAlbumTracks,
  getArtistTracks,
};
