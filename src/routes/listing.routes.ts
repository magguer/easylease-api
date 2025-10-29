import { Router } from "express";
import {
  listPublished,
  listAll,
  getListingBySlug,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  uploadListingImages,
  deleteListingImage,
} from "../controllers/listing.controller";
import multer from "multer";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
