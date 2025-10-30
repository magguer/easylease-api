import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // Use local MongoDB for development, Atlas for production
  const mongoUri = process.env.NODE_ENV === "production"
    ? env.MONGODB_URI
    : "mongodb://localhost:27017/easylease";

  await mongoose.connect(mongoUri, {
    dbName: process.env.NODE_ENV === "production" ? "easylease" : "easylease",
  });

  console.log(`✅ MongoDB connected successfully (${process.env.NODE_ENV})`);
}
