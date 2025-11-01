import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import config from "./config";
import routes from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB connected successfully to ${MONGODB_URI}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

const options: cors.CorsOptions = {
  origin: config.allowedOriginsCors,
  credentials: true,
};

const app = express();
const PORT = config.port;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cors(options));
app.use(express.json());

// Health check endpoint
app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Mount routes - now all routes will be under their respective paths
routes(app);

// Start server with database connection
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.info(` >>> EXPRESS_PRIVATE Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export { express, app };
