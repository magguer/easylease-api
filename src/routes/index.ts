import { Router } from "express";
import listingRoutes from "./listing.routes";
import leadRoutes from "./lead.routes";
import partnerRoutes from "./partner.routes";

const router = Router();

router.use("/listings", listingRoutes);
router.use("/leads", leadRoutes);
router.use("/partners", partnerRoutes);

export default router;
