import express from "express";
import Listing from "../models/Listing";
import { z } from "zod";

type Request = express.Request;
type Response = express.Response;

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
