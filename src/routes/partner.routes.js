import { Router } from "express";
import { 
  getAllPartners, 
  getPartnerById,
  createPartner, 
  updatePartner,
  deletePartner,
  updatePartnerStatus, 
} from "../controllers/partner.controller.js";

const router = Router();

router.get("/", getAllPartners);
router.get("/:id", getPartnerById);
router.post("/", createPartner);
router.put("/:id", updatePartner);
router.delete("/:id", deletePartner);
router.patch("/:id/status", updatePartnerStatus);

export default router;
