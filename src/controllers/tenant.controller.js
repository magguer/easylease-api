import Tenant from "../models/Tenant.js";
import Lead from "../models/Lead.js";
import Listing from "../models/Listing.js";

// Get all tenants
export const getAllTenants = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const user = req.user;

    const query = {};

    // Filtros por status y búsqueda
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // FILTROS POR ROL
    // Manager: ve todos los inquilinos
    if (user.role === "manager") {
      // No se agrega filtro adicional
    }
    // Owner: solo ve inquilinos de sus propiedades
    else if (user.role === "owner") {
      if (!user.partner_id) {
        return res.status(400).json({
          success: false,
          message: "Owner must have a partner_id",
        });
      }
      
      // Obtener propiedades del owner
      const ownerListings = await Listing.find({
        owner_partner_id: user.partner_id,
      });
      const listingIds = ownerListings.map((l) => l._id);
      
      query.listing_id = { $in: listingIds };
    }
    // Tenant: solo ve su propia información
    else if (user.role === "tenant") {
      if (!user.tenant_id) {
        return res.status(400).json({
          success: false,
          message: "Tenant must have a tenant_id",
        });
      }
      query._id = user.tenant_id;
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .populate("listing_id", "title address suburb")
        .populate("converted_from_lead_id", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Tenant.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: tenants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all tenants error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get tenant by ID
export const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id)
      .populate("listing_id")
      .populate("converted_from_lead_id");

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error("Get tenant by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create tenant
export const createTenant = async (req, res) => {
  try {
    const tenantData = req.body;

    // Validate listing exists
    const listing = await Listing.findById(tenantData.listing_id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Create tenant
    const tenant = new Tenant(tenantData);
    await tenant.save();

    // Update listing status to rented
    listing.status = "rented";
    await listing.save();

    // If converted from lead, update lead status
    if (tenantData.converted_from_lead_id) {
      await Lead.findByIdAndUpdate(tenantData.converted_from_lead_id, {
        status: "converted",
      });
    }

    res.status(201).json({
      success: true,
      data: tenant,
      message: "Tenant created successfully",
    });
  } catch (error) {
    console.error("Create tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update tenant
export const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("listing_id")
      .populate("converted_from_lead_id");

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    res.json({
      success: true,
      data: tenant,
      message: "Tenant updated successfully",
    });
  } catch (error) {
    console.error("Update tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete tenant
export const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Update listing status back to published
    if (tenant.listing_id) {
      await Listing.findByIdAndUpdate(tenant.listing_id, {
        status: "published",
      });
    }

    await tenant.deleteOne();

    res.json({
      success: true,
      message: "Tenant deleted successfully",
    });
  } catch (error) {
    console.error("Delete tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Convert lead to tenant
export const convertLeadToTenant = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { lease_start, lease_end, weekly_rent, bond_paid, ...otherData } = req.body;

    // Get lead
    const lead = await Lead.findById(leadId).populate("listing_id");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (!lead.listing_id) {
      return res.status(400).json({
        success: false,
        message: "Lead must be associated with a listing",
      });
    }

    // Create tenant from lead data
    const tenantData = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      listing_id: lead.listing_id._id,
      lease_start,
      lease_end,
      weekly_rent,
      bond_paid,
      converted_from_lead_id: leadId,
      notes: lead.message || "",
      ...otherData,
    };

    const tenant = new Tenant(tenantData);
    await tenant.save();

    // Update lead status
    lead.status = "converted";
    await lead.save();

    // Update listing status
    await Listing.findByIdAndUpdate(lead.listing_id._id, {
      status: "rented",
    });

    res.status(201).json({
      success: true,
      data: tenant,
      message: "Lead converted to tenant successfully",
    });
  } catch (error) {
    console.error("Convert lead to tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get tenants ending soon
export const getTenantsEndingSoon = async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const tenants = await Tenant.find({
      status: { $in: ["active", "ending_soon"] },
      lease_end: { $lte: thirtyDaysFromNow, $gte: new Date() },
    })
      .populate("listing_id", "title address")
      .sort({ lease_end: 1 });

    res.json({
      success: true,
      data: tenants,
    });
  } catch (error) {
    console.error("Get tenants ending soon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
