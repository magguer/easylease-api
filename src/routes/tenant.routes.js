import { Router } from "express";
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  convertLeadToTenant,
  getTenantsEndingSoon,
  unlinkTenantFromListing,
} from "../controllers/tenant.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// All tenant routes require authentication
router.use(authenticate);

// Get all tenants
router.get("/", getAllTenants);

// Get tenants ending soon
router.get("/ending-soon", getTenantsEndingSoon);

// Get tenant by ID
router.get("/:id", getTenantById);

// Create tenant
router.post("/", createTenant);

// Update tenant
router.put("/:id", updateTenant);

// Unlink tenant from listing
router.post("/:id/unlink", unlinkTenantFromListing);

// Delete tenant
router.delete("/:id", deleteTenant);

// Convert lead to tenant
router.post("/convert-from-lead/:leadId", convertLeadToTenant);

export default router;
