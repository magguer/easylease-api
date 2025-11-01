import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import routes from "./routes";
const app = express();
// MongoDB connection for serverless (lazy connection)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";
let dbConnected = false;
async function ensureDbConnection() {
    if (!dbConnected && mongoose.connection.readyState !== 1) {
        try {
            await mongoose.connect(MONGODB_URI);
            dbConnected = true;
            console.log("✅ MongoDB connected (serverless)");
        }
        catch (error) {
            console.error("❌ MongoDB connection error:", error);
            throw error;
        }
    }
}
// Middleware to ensure DB connection for serverless
app.use(async (_req, res, next) => {
    try {
        await ensureDbConnection();
        next();
    }
    catch (error) {
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
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        env: {
            NODE_ENV: process.env.NODE_ENV,
            hasMongoURI: !!process.env.MONGODB_URI,
        }
    });
});
// Mount routes directly (no /api prefix here since routes are already defined)
routes(app);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        path: req.path,
    });
});
export default app;
