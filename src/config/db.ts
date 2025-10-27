import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  
  await mongoose.connect(env.MONGODB_URI, {
    dbName: "easylease",
  });
  
  console.log("✅ MongoDB connected successfully");
}
