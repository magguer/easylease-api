import { Router } from "express";
import { 
  getAllLeads, 
  getLeadById,
  createLead, 
  updateLead,
  deleteLead,
  updateLeadStatus, 
} from "../controllers/lead.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Public route - anyone can create a lead (from website)
router.post("/", createLead);

// Protected routes - require authentication
router.get("/", authenticate, getAllLeads);
router.get("/:id", authenticate, getLeadById);
router.put("/:id", authenticate, updateLead);
router.delete("/:id", authenticate, deleteLead);
router.patch("/:id/status", authenticate, updateLeadStatus);

export default router;
