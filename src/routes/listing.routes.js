import { Router } from "express";
import { listPublished, listAll, getListingBySlug, getListingById, createListing, updateListing, deleteListing, uploadListingImages, deleteListingImage, upload, } from "../controllers/listing.controller.js";
const router = Router();
// Admin routes (specific paths first)
router.get("/admin/all", listAll);
router.get("/admin/:id", getListingById);
// Image upload routes
router.post("/upload-images", upload.array('images', 10), uploadListingImages);
router.delete("/delete-image", deleteListingImage);
// Public routes
router.get("/", listPublished);
router.get("/slug/:slug", getListingBySlug);
// CRUD routes
router.post("/", createListing);
router.put("/:id", updateListing);
router.delete("/:id", deleteListing);
export default router;
