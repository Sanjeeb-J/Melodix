const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in environment variables.");
    console.error("Please add MONGO_URI to your Railway environment variables.");
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
