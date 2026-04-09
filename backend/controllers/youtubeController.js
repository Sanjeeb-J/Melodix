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

const formatDuration = (iso) => {
  if (!iso) return "--:--";

  const hours = Number(iso.match(/(\d+)H/)?.[1] || 0);
  const minutes = Number(iso.match(/(\d+)M/)?.[1] || 0);
  const seconds = Number(iso.match(/(\d+)S/)?.[1] || 0);
  const totalMinutes = hours * 60 + minutes;

  return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
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

const searchYouTube = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const cached = getCached(query);
    if (cached) {
      console.log(`[YouTube Cache HIT] "${query}" — served from cache | Cache size: ${getCacheStats().size}`);
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    console.log(`[YouTube Cache MISS] "${query}" — calling YouTube API`);
    res.setHeader("X-Cache", "MISS");

    const searchResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: 10,
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    const items = searchResponse.data.items || [];
    const videoIds = items.map((item) => item.id.videoId).filter(Boolean).join(",");

    const durationMap = {};
    if (videoIds) {
      const videoResponse = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
        params: {
          part: "contentDetails",
          id: videoIds,
          key: process.env.YOUTUBE_API_KEY,
        },
      });

      for (const item of videoResponse.data.items || []) {
        durationMap[item.id] = {
          text: formatDuration(item.contentDetails.duration),
          seconds: Number(item.contentDetails.duration?.match(/(\d+)M/)?.[1] || 0) * 60 +
            Number(item.contentDetails.duration?.match(/(\d+)S/)?.[1] || 0) +
            Number(item.contentDetails.duration?.match(/(\d+)H/)?.[1] || 0) * 3600,
        };
      }
    }

    const results = items
      .map((item) => ({
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || "",
        videoId: item.id.videoId,
        youtubeLink: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        duration: durationMap[item.id.videoId]?.text || "--:--",
        durationSeconds: durationMap[item.id.videoId]?.seconds || 0,
      }))
      .filter((item) => item.videoId)
      .filter((item) => item.durationSeconds >= MIN_DURATION_SECONDS && item.durationSeconds <= MAX_DURATION_SECONDS)
      .filter((item) => {
        const haystack = `${item.title} ${item.artist}`.toLowerCase();
        return !BLACKLIST.some((keyword) => haystack.includes(keyword));
      })
      .sort((a, b) => {
        const aTopic = a.artist.includes("- Topic");
        const bTopic = b.artist.includes("- Topic");
        if (aTopic === bTopic) return 0;
        return aTopic ? -1 : 1;
      })
      .map(({ durationSeconds, ...item }) => item);

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

    return res.json({ title, artist, thumbnail, year, tracks });
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

    return res.json({ name, thumbnail, subscribers, tracks });
  } catch (error) {
    console.error("[YouTube Music] Artist fetch error:", error?.message || error);
    return res.status(500).json({ message: "Failed to load artist" });
  }
};

module.exports = {
  searchYouTube,
  searchMusic,
  getPlaylistTracks,
  getAlbumTracks,
  getArtistTracks,
};
