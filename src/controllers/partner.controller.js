import Partner from "../models/Partner.js";
import { z } from "zod";
const createPartnerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    company_name: z.string().optional(),
});
export async function getAllPartners(req, res) {
    try {
        const { status } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const partners = await Partner.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, data: partners, count: partners.length });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function createPartner(req, res) {
    try {
        const validated = createPartnerSchema.parse(req.body);
        const created = await Partner.create(validated);
        res.status(201).json({ success: true, data: created });
    }
    catch (error) {
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
export async function getPartnerById(req, res) {
    try {
        const { id } = req.params;
        const partner = await Partner.findById(id);
        if (!partner) {
            return res.status(404).json({ success: false, error: "Partner not found" });
        }
        res.json({ success: true, data: partner });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function updatePartner(req, res) {
    try {
        const { id } = req.params;
        const updated = await Partner.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            return res.status(404).json({ success: false, error: "Partner not found" });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "Email already exists" });
        }
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function deletePartner(req, res) {
    try {
        const { id } = req.params;
        const deleted = await Partner.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Partner not found" });
        }
        res.json({ success: true, message: "Partner deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function updatePartnerStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["active", "inactive", "pending"].includes(status)) {
            return res.status(400).json({ success: false, error: "Invalid status" });
        }
        const updated = await Partner.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) {
            return res
                .status(404)
                .json({ success: false, error: "Partner not found" });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
