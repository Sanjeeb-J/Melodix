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
  await connectDB();
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
      yt = await Innertube.create(options);
    }
    
    console.log(`[Stream] youtubei.js initialized as ${options.device_category} client`);
    app.set('yt', yt);
  } catch (err) {
    console.error("[Stream] Failed to initialize youtubei.js (falling back):", err.message);
    try {
      yt = await Innertube.create();
      app.set('yt', yt);
    } catch (e) {}
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
