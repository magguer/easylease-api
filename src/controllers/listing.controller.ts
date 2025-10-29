import express from "express";
import Listing from "../models/Listing";
import { z } from "zod";
import { uploadListingImage, getListingImageUrl, deleteListingImage as deleteFromSupabase, supabase, IMAGES_BUCKET } from "../config/supabase";
import multer from "multer";

type Request = express.Request;
type Response = express.Response;

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

const createListingSchema = z.object({
  title: z.string().min(3),
  price_per_week: z.number().positive(),
  address: z.string().min(5),
  suburb: z.string().optional(),
  bond: z.number().min(0).optional(),
  bills_included: z.boolean().optional(),
  room_type: z.enum(["master", "double", "single"]).optional(),
  available_from: z.string().or(z.date()).optional(),
  min_term_weeks: z.number().positive().optional(),
  preferred_tenants: z.array(z.string()).optional(),
  house_features: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["draft", "published", "reserved", "rented"]).optional(),
  locale: z.enum(["es", "en"]).optional(),
  location: z
    .object({
      type: z.literal("Point"),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
});

export async function listPublished(req: Request, res: Response) {
  try {
    const { suburb, room_type, min_price, max_price, limit = 50 } = req.query;

    const filter: any = { status: "published" };

    if (suburb) filter.suburb = suburb;
    if (room_type) filter.room_type = room_type;
    if (min_price || max_price) {
      filter.price_per_week = {};
      if (min_price) filter.price_per_week.$gte = Number(min_price);
      if (max_price) filter.price_per_week.$lte = Number(max_price);
    }

    const items = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: items, count: items.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getListingBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const listing = await Listing.findOne({ slug, status: "published" });

    if (!listing) {
      return res
        .status(404)
        .json({ success: false, error: "Listing not found" });
    }

    res.json({ success: true, data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getListingById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      return res
        .status(404)
        .json({ success: false, error: "Listing not found" });
    }

    res.json({ success: true, data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function listAll(req: Request, res: Response) {
  try {
    const { limit = 50, status } = req.query;

    const filter: any = {};
    if (status) filter.status = status;

    const items = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: items, count: items.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createListing(req: Request, res: Response) {
  try {
    const validated = createListingSchema.parse(req.body);

    const slug =
      `${validated.suburb || "room"}-${validated.title}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "") + `-${Date.now()}`;

    const created = await Listing.create({
      ...validated,
      slug,
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, error: error.issues });
    }
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateListing(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = await Listing.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, error: "Listing not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteListing(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await Listing.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, error: "Listing not found" });
    }

    res.json({ success: true, message: "Listing deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Image upload endpoint
export async function uploadListingImages(req: Request, res: Response) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }

    const { folder } = req.body;
    const uploadedUrls: string[] = [];

    for (const file of req.files as Express.Multer.File[]) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.mimetype.split('/')[1]}`;
      const fullPath = `${folder}/${fileName}`;

      // Upload directly to Supabase
      const { data, error } = await supabase.storage
        .from(IMAGES_BUCKET)
        .upload(fullPath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(IMAGES_BUCKET)
        .getPublicUrl(fullPath);

      uploadedUrls.push(urlData.publicUrl);
    }

    res.json({
      success: true,
      data: {
        uploadedUrls
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete image endpoint
export async function deleteListingImage(req: Request, res: Response) {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: "Image URL is required" });
    }

    // Extract the path from the Supabase URL
    // URL format: https://domain.supabase.co/storage/v1/object/public/bucket/path/file.jpg
    const urlParts = imageUrl.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) {
      return res.status(400).json({ success: false, error: "Invalid image URL format" });
    }

    const filePath = urlParts[1]; // This will be "bucket/path/file.jpg"

    // Delete from Supabase
    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .remove([filePath]);

    if (error) throw error;

    res.json({
      success: true,
      message: "Image deleted successfully"
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
