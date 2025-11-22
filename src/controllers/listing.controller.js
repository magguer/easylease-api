import Listing from "../models/Listing.js";
import { z } from "zod";
import { supabase, IMAGES_BUCKET } from "../config/supabase.js";
import multer from "multer";
// Configure multer for memory storage (used in routes, not here)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
export { upload };
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
export async function listPublished(req, res) {
    try {
        const { suburb, room_type, min_price, max_price, limit = 50 } = req.query;
        const filter = { status: "published" };
        if (suburb)
            filter.suburb = suburb;
        if (room_type)
            filter.room_type = room_type;
        if (min_price || max_price) {
            filter.price_per_week = {};
            if (min_price)
                filter.price_per_week.$gte = Number(min_price);
            if (max_price)
                filter.price_per_week.$lte = Number(max_price);
        }
        const items = await Listing.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit));
        res.json({ success: true, data: items, count: items.length });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function getListingBySlug(req, res) {
    try {
        const { slug } = req.params;
        const listing = await Listing.findOne({ slug, status: "published" });
        if (!listing) {
            return res
                .status(404)
                .json({ success: false, error: "Listing not found" });
        }
        res.json({ success: true, data: listing });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function getListingById(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;
        
        const listing = await Listing.findById(id).populate("owner_partner_id", "name email phone");
        
        if (!listing) {
            return res
                .status(404)
                .json({ success: false, message: "Listing not found" });
        }
        
        // FILTROS POR ROL
        // Manager: puede ver cualquier propiedad
        if (user.role === "manager") {
            return res.json({ success: true, data: listing });
        }
        
        // Owner: solo puede ver sus propias propiedades
        if (user.role === "owner") {
            if (!user.partner_id) {
                return res.status(400).json({
                    success: false,
                    message: "Owner must have a partner_id",
                });
            }
            
            if (listing.owner_partner_id._id.toString() !== user.partner_id) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. This property belongs to another owner.",
                });
            }
            
            return res.json({ success: true, data: listing });
        }
        
        // Tenant: solo puede ver la propiedad que está rentando
        if (user.role === "tenant") {
            if (!user.tenant_id) {
                return res.status(400).json({
                    success: false,
                    message: "Tenant must have a tenant_id",
                });
            }
            
            const Tenant = (await import("../models/Tenant.js")).default;
            const tenantData = await Tenant.findById(user.tenant_id);
            
            if (!tenantData || tenantData.listing_id.toString() !== id) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only view your rental property.",
                });
            }
            
            return res.json({ success: true, data: listing });
        }
        
        // Rol no reconocido
        return res.status(403).json({
            success: false,
            message: "Access denied",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function listAll(req, res) {
    try {
        const { limit = 50, status } = req.query;
        const user = req.user;
        const filter = {};
        
        // Filtrar por status si se proporciona
        if (status)
            filter.status = status;
        
        // FILTROS POR ROL
        // Manager: ve todas las propiedades
        if (user.role === "manager") {
            // No se agrega filtro adicional
        }
        // Owner: solo ve sus propiedades
        else if (user.role === "owner") {
            if (!user.partner_id) {
                return res.status(400).json({
                    success: false,
                    message: "Owner must have a partner_id",
                });
            }
            filter.owner_partner_id = user.partner_id;
        }
        // Tenant: solo ve la propiedad de su alquiler
        else if (user.role === "tenant") {
            if (!user.tenant_id) {
                return res.status(400).json({
                    success: false,
                    message: "Tenant must have a tenant_id",
                });
            }
            // Obtener el listing_id del tenant
            const Tenant = (await import("../models/Tenant.js")).default;
            const tenantData = await Tenant.findById(user.tenant_id);
            if (!tenantData) {
                return res.status(404).json({
                    success: false,
                    message: "Tenant data not found",
                });
            }
            filter._id = tenantData.listing_id;
        } else {
            return res.status(403).json({
                success: false,
                message: "Invalid user role",
            });
        }
        
        const items = await Listing.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .populate("owner_partner_id", "name email company");
        res.json({ success: true, data: items, count: items.length });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function createListing(req, res) {
    try {
        const validated = createListingSchema.parse(req.body);
        const slug = `${validated.suburb || "room"}-${validated.title}`
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-]/g, "") + `-${Date.now()}`;
            
        const listingData = {
            ...validated,
            slug,
        };

        // Assign owner if user is an owner
        if (req.user && req.user.role === 'owner' && req.user.partner_id) {
            listingData.owner_partner_id = req.user.partner_id;
        }

        const created = await Listing.create(listingData);
        res.status(201).json({ success: true, data: created });
    }
    catch (error) {
        console.error("Error creating listing:", error);
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ success: false, error: error.issues });
        }
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function updateListing(req, res) {
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function deleteListing(req, res) {
    try {
        const { id } = req.params;
        const deleted = await Listing.findByIdAndDelete(id);
        if (!deleted) {
            return res
                .status(404)
                .json({ success: false, error: "Listing not found" });
        }
        res.json({ success: true, message: "Listing deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
// Image upload endpoint
export async function uploadListingImages(req, res) {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ success: false, error: "No files uploaded" });
        }
        const { folder } = req.body;
        const uploadedUrls = [];
        for (const file of req.files) {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.mimetype.split('/')[1]}`;
            const fullPath = `${folder}/${fileName}`;
            // Upload directly to Supabase
            const { data, error } = await supabase.storage
                .from(IMAGES_BUCKET)
                .upload(fullPath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });
            if (error)
                throw error;
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
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
// Delete image endpoint
export async function deleteListingImage(req, res) {
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
        if (error)
            throw error;
        res.json({
            success: true,
            message: "Image deleted successfully"
        });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
