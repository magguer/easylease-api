import express from "express";
import {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  addDocument,
  removeDocument,
  terminateContract,
  restartContract,
  assignTenantToContract,
  duplicateContract,
} from "../controllers/contract.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Contract CRUD
router.get("/", getAllContracts);
router.get("/:id", getContractById);
router.post("/", createContract);
router.put("/:id", updateContract);
router.delete("/:id", deleteContract);

// Contract actions
router.post("/:id/assign-tenant", assignTenantToContract);
router.post("/:id/terminate", terminateContract);
router.post("/:id/restart", restartContract);
router.post("/:id/duplicate", duplicateContract);

// Document management
router.post("/:id/documents", addDocument);
router.delete("/:id/documents/:documentId", removeDocument);

export default router;
