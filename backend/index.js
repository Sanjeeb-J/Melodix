const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { Innertube } = require("youtubei.js");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");
const streamRoutes = require("./routes/streamRoutes");

const app = express();

let yt;

// Connect to DB then start server
async function startServer() {
  await connectDB();
  
  try {
    yt = await Innertube.create();
    console.log("[Stream] youtubei.js (Innertube) initialized");
    app.set('yt', yt); // Make it available via app.get('yt')
  } catch (err) {
    console.error("[Stream] Failed to initialize youtubei.js:", err.message);
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

const PORT = process.env.PORT || 8080;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
