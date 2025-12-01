import Owner from "../models/Owner.js";
import { z } from "zod";
const createOwnerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    company: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    create_user_account: z.boolean().optional(),
    user_password: z.string().optional(),
});
export async function getAllOwners(req, res) {
    try {
        const { status } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const owners = await Owner.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, data: owners, count: owners.length });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
export async function createOwner(req, res) {
    try {
        const validated = createOwnerSchema.parse(req.body);
        
        // Create the owner
        const created = await Owner.create({
            name: validated.name,
            email: validated.email,
            phone: validated.phone,
            company: validated.company,
            status: validated.status || 'active',
        });

        let userResponse = null;

        // Create user account if requested
        if (validated.create_user_account && validated.user_password) {
            try {
                const User = (await import('../models/User.js')).default;

                // Check if user already exists
                const existingUser = await User.findOne({ email: validated.email.toLowerCase() });
                
                if (existingUser) {
                    userResponse = {
                        message: 'Owner created but user account already exists with this email'
                    };
                } else {
                    // Create user with owner role (password will be hashed automatically by User model pre-save hook)
                    const newUser = await User.create({
                        email: validated.email.toLowerCase(),
                        password: validated.user_password,
                        name: validated.name,
                        role: 'owner',
                        owner_id: created._id,
                        phone: validated.phone,
                    });

                    userResponse = {
                        email: newUser.email,
                        temporary_password: validated.user_password,
                        role: 'owner'
                    };
                }
            } catch (userError) {
                console.error('Error creating user account:', userError);
                userResponse = {
                    message: 'Owner created but failed to create user account: ' + userError.message
                };
            }
        }

        res.status(201).json({ 
            success: true, 
            data: created,
            user: userResponse
        });
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
export async function getOwnerById(req, res) {
    try {
        const { id } = req.params;
        const owner = await Owner.findById(id);
        if (!owner) {
            return res.status(404).json({ success: false, error: "Owner not found" });
        }
        res.json({ success: true, data: owner });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function updateOwner(req, res) {
    try {
        const { id } = req.params;
        const updated = await Owner.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            return res.status(404).json({ success: false, error: "Owner not found" });
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

export async function deleteOwner(req, res) {
    try {
        const { id } = req.params;
        
        // Find the owner first
        const owner = await Owner.findById(id);
        if (!owner) {
            return res.status(404).json({ success: false, error: "Owner not found" });
        }

        // Check if owner has listings
        const Listing = (await import('../models/Listing.js')).default;
        const listingsCount = await Listing.countDocuments({ owner_id: id });
        
        if (listingsCount > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot delete owner with ${listingsCount} active listing(s). Please delete or reassign the listings first.` 
            });
        }

        // Deactivate associated user account if exists (instead of deleting)
        try {
            const User = (await import('../models/User.js')).default;
            const userAccount = await User.findOne({ owner_id: id });
            if (userAccount) {
                await User.findByIdAndUpdate(userAccount._id, { 
                    isActive: false,
                    owner_id: null // Remove the association
                });
                console.log(`Deactivated user account for owner: ${owner.email}`);
            }
        } catch (userError) {
            console.error('Error deactivating user account:', userError);
            // Continue with owner deletion even if user deactivation fails
        }

        // Delete the owner
        await Owner.findByIdAndDelete(id);
        
        res.json({ 
            success: true, 
            message: "Owner deleted and associated user account deactivated successfully" 
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function updateOwnerStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["active", "inactive", "pending"].includes(status)) {
            return res.status(400).json({ success: false, error: "Invalid status" });
        }
        const updated = await Owner.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) {
            return res
                .status(404)
                .json({ success: false, error: "Owner not found" });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
