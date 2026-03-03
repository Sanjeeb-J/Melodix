const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");
const streamRoutes = require("./routes/streamRoutes");

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
