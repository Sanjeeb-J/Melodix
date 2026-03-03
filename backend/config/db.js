const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn("[DB] MONGO_URI missing — database features (auth, playlists) will be unavailable.");
      return;
    }
    console.log("[DB] Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    });
    console.log("MongoDB Connected ✓");
  } catch (error) {
    // Don't crash the server — streaming works without DB
    console.error("[DB] MongoDB connection failed:", error.message);
    console.warn("[DB] Database features disabled. Audio streaming still works.");
  }
};

module.exports = connectDB;
