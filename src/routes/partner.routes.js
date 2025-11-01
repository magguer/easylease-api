import { Router } from "express";
import { getAllPartners, createPartner, updatePartnerStatus, } from "../controllers/partner.controller.js";
const router = Router();
router.get("/", getAllPartners);
router.post("/", createPartner);
router.patch("/:id/status", updatePartnerStatus);
export default router;
