import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import config from "./config";
import routes from "./routes";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";
let dbConnected = false;
async function connectDB() {
    if (dbConnected || mongoose.connection.readyState === 1) {
        return;
    }
    try {
        await mongoose.connect(MONGODB_URI);
        dbConnected = true;
        console.log(`✅ MongoDB connected successfully`);
    }
    catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw error;
    }
}
const options = {
    origin: config.allowedOriginsCors,
    credentials: true,
};
const app = express();
const PORT = config.port;
// Middleware to ensure DB connection (lazy connection for serverless)
app.use(async (_req, res, next) => {
    try {
        await connectDB();
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
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cors(options));
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
// Health check endpoint
app.get("/api/health", (_, res) => {
    res.json({
        ok: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});
// Mount routes
routes(app);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        path: req.path,
    });
});
// Start server only if not imported as module (i.e., running directly)
if (import.meta.url === `file://${process.argv[1]}`) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.info(` >>> EXPRESS_PRIVATE Server listening on http://localhost:${PORT}`);
        });
    }).catch((error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
    });
}
export { app };
