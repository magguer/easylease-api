import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { connectDB } from "./config/db";

const app = express();

// Connect to database (lazy connection for serverless)
let dbConnected = false;

async function ensureDbConnection() {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      success: false,
      error: "Database connection failed"
    });
  }
});

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Health check
app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasMongoURI: !!process.env.MONGODB_URI,
      hasSupabaseURL: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
});

// API routes
app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
  });
});

export default app;
