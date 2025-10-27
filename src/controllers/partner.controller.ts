import express from "express";
import Partner from "../models/Partner";
import { z } from "zod";

type Request = express.Request;
type Response = express.Response;

const createPartnerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
});

export async function getAllPartners(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const filter: any = {};

    if (status) filter.status = status;

    const partners = await Partner.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, data: partners, count: partners.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createPartner(req: Request, res: Response) {
  try {
    const validated = createPartnerSchema.parse(req.body);
    const created = await Partner.create(validated);

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues });
    }
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, error: "Email already exists" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePartnerStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const updated = await Partner.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, error: "Partner not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
