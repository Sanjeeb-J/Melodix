const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { Innertube } = require("youtubei.js");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
require("dotenv").config();

// Fix for ytdl-core update check 403 error
process.env.YTDL_NO_UPDATE = "1";

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");
const streamRoutes = require("./routes/streamRoutes");
const likedRoutes = require("./routes/likedRoutes");
const historyRoutes = require("./routes/historyRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const searchRoutes = require("./routes/searchRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
let yt;

// --- Auto-Downloader for Portability ---
const BIN_DIR = path.join(__dirname, "bin");
if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR);

const autoDownloadBinaries = () => {
  console.log("[Setup] Checking for core binaries...");
  try {
    execSync("yt-dlp --version");
    console.log("[Setup] yt-dlp found in system path.");
  } catch (e) {
    console.log("[Setup] yt-dlp not found. Attempting to install via yt-dlp-exec...");
    try {
      require("yt-dlp-exec");
      console.log("[Setup] yt-dlp-exec is ready to handle binary failover.");
    } catch (err) {
      console.error("[Setup] Critical: Failed to setup yt-dlp-exec failover.");
    }
  }
};

// Connect to DB then start server
async function startServer() {
  try {
    await connectDB();
    console.log("[Setup] Database initialization complete.");
  } catch (dbErr) {
    console.error("[Setup] Database connection failed. Playlist features will be disabled.", dbErr.message);
  }
  
  autoDownloadBinaries();
  
  try {
    const options = { 
      location: 'IN',
      device_category: 'ANDROID_TESTSUITE' 
    };

    if (process.env.YOUTUBE_COOKIE) {
      console.log("[Stream] Initializing with cookies...");
      yt = await Innertube.create({ ...options, cookie: process.env.YOUTUBE_COOKIE });
    } else {
      console.log("[Stream] Initializing GUEST session (no cookies)...");
      // Use standard Innertube.create() for widest compatibility when failing
      try {
        yt = await Innertube.create(options);
      } catch (e) {
        console.warn("[Stream] Preferred client failed, falling back to default WEB client...");
        yt = await Innertube.create(); 
      }
    }
    
    console.log(`[Stream] youtubei.js initialized successfully`);
    app.set('yt', yt);
  } catch (err) {
    console.error(`[Stream] youtubei.js initialization failed: ${err.message}. Streaming will rely on yt-dlp fallback.`);
    app.set('yt', null); // Explicitly null so controller knows to skip it
  }

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/liked", likedRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/recommendations", recommendRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/user", userRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Melodix API running");
});

const PORT = process.env.PORT || 10000; // Match Render default

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
