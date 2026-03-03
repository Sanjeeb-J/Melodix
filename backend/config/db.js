const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing from .env file");
    }
    
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");
  } catch (error) {
    if (error.message.includes("ECONNREFUSED")) {
      console.error("CRITICAL ERROR: Could not connect to local MongoDB.");
      console.error("FIX: Please start your MongoDB service (e.g. `brew services start mongodb-community` OR ensure your Docker/Windows MongoDB service is running).");
    } else {
      console.error("MongoDB Connection Error:", error.message);
    }
    process.exit(1);
  }
};

module.exports = connectDB;
