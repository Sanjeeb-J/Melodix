const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://sanjeebkodoth_db_user:5erK1D6UWwz0Ncf7@melodix.t6zm1gt.mongodb.net/?appName=Melodix"
    );
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
