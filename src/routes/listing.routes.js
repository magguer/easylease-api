import { Router } from "express";
import { listPublished, listAll, getListingBySlug, getListingById, createListing, updateListing, deleteListing, uploadListingImages, deleteListingImage, upload, } from "../controllers/listing.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Admin routes (specific paths first) - require authentication
router.get("/admin/all", authenticate, listAll);
router.get("/admin/:id", authenticate, getListingById);

// Image upload routes - require authentication
router.post("/upload-images", authenticate, upload.array('images', 10), uploadListingImages);
router.delete("/delete-image", authenticate, deleteListingImage);

// Public routes (must be before /:id)
router.get("/public", listPublished);
router.get("/slug/:slug", getListingBySlug);

// Authenticated routes
router.get("/", authenticate, listAll); // Changed from listPublished to listAll with role filtering
router.get("/:id", authenticate, getListingById);

// CRUD routes - require authentication
router.post("/", authenticate, createListing);
router.put("/:id", authenticate, updateListing);
router.delete("/:id", authenticate, deleteListing);
export default router;
