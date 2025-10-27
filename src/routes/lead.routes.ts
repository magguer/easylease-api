import { Router } from "express";
import {
  getAllLeads,
  createLead,
  updateLeadStatus,
} from "../controllers/lead.controller";

const router = Router();

router.get("/", getAllLeads);
router.post("/", createLead);
router.patch("/:id/status", updateLeadStatus);

export default router;
