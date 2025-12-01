import { Router } from "express";
import { 
  getAllOwners, 
  getOwnerById,
  createOwner, 
  updateOwner,
  deleteOwner,
  updateOwnerStatus, 
} from "../controllers/owner.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes - require authentication
router.get("/", authenticate, getAllOwners);
router.get("/:id", authenticate, getOwnerById);
router.post("/", authenticate, createOwner);
router.put("/:id", authenticate, updateOwner);
router.delete("/:id", authenticate, deleteOwner);
router.patch("/:id/status", authenticate, updateOwnerStatus);

export default router;
