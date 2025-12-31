const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const youtubeRoutes = require("./routes/youtubeRoutes");

const app = express();

// DB
connectDB();

// Middleware
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept, Authorization"
//   );
//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET, POST, PUT, DELETE, OPTIONS"
//   );

//   if (req.method === "OPTIONS") {
//     return res.sendStatus(200);
//   }

//   next();
// });

app.use(cors({ origin: "*" }));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/youtube", youtubeRoutes);

app.get("/", (req, res) => {
  res.send("Melodix API running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
