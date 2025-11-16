import { Router } from "express";
import { getStats } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// All dashboard routes require authentication
router.get("/stats", authenticate, getStats);

export default router;
