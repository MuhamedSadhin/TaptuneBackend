import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); 

const connectDB = async () => {
  try {
        const uri = process.env.MONGO_URI;

        if (!uri) {
          throw new Error(
            "❌ MONGO_URI is not defined in environment variables"
          );
        }
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected", uri);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
