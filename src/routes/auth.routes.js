import { Router } from "express";
import {
  login,
  getCurrentUser,
  createAdmin,
  changePassword,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.post("/login", login);
router.post("/admin/create", createAdmin); // For initial setup only - should be protected in production

// Protected routes
router.get("/me", authenticate, getCurrentUser);
router.post("/change-password", authenticate, changePassword);

export default router;
