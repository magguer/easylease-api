import Lead from "../models/Lead.js";
import { z } from "zod";
const createLeadSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    message: z.string().optional(),
    listing_id: z.string().optional(),
});
export async function getAllLeads(req, res) {
    try {
        const { status } = req.query;
        const { role, owner_id } = req.user;
        
        const filter = {};
        if (status) filter.status = status;
        
        // For owners, only show leads for their properties
        if (role === 'owner' && owner_id) {
            // Import Listing model dynamically to avoid circular dependencies
            const Listing = (await import('../models/Listing.js')).default;
            
            // Find all listing IDs owned by this partner
            const ownerListings = await Listing.find({ owner_id: owner_id }).select('_id');
            const listingIds = ownerListings.map(l => l._id);
            
            // Filter leads by these listing IDs
            filter.listing_id = { $in: listingIds };
        }
        // Managers see all leads (no additional filter)
        
        const leads = await Lead.find(filter)
            .populate("listing_id", "title slug address")
            .sort({ createdAt: -1 });
        
        res.json({ success: true, data: leads, count: leads.length });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function createLead(req, res) {
    try {
        const validated = createLeadSchema.parse(req.body);
        const created = await Lead.create(validated);
        res.status(201).json({ success: true, data: created });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: error.issues });
        }
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function getLeadById(req, res) {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id).populate("listing_id", "title slug");
        if (!lead) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }
        res.json({ success: true, data: lead });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function updateLead(req, res) {
    try {
        const { id } = req.params;
        const updated = await Lead.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function deleteLead(req, res) {
    try {
        const { id } = req.params;
        const deleted = await Lead.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }
        res.json({ success: true, message: "Lead deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function updateLeadStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["new", "contacted", "converted", "discarded"].includes(status)) {
            return res.status(400).json({ success: false, error: "Invalid status" });
        }
        const updated = await Lead.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
