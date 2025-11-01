import { Router } from "express";
import { 
  getAllLeads, 
  getLeadById,
  createLead, 
  updateLead,
  deleteLead,
  updateLeadStatus, 
} from "../controllers/lead.controller.js";

const router = Router();

router.get("/", getAllLeads);
router.get("/:id", getLeadById);
router.post("/", createLead);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);
router.patch("/:id/status", updateLeadStatus);

export default router;
