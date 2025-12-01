import Tenant from "../models/Tenant.js";
import Contract from "../models/Contract.js";
import Lead from "../models/Lead.js";
import Listing from "../models/Listing.js";
import User from "../models/User.js";

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
    // Owner: solo ve inquilinos de sus propiedades (incluyendo desvinculados)
    else if (user.role === "owner") {
      if (!user.owner_id) {
        return res.status(400).json({
          success: false,
          message: "Owner must have a owner_id",
        });
      }
      
      // Filtrar por owner_id - incluye tanto activos como históricos
      query.owner_id = user.owner_id;
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
        .populate({
          path: "current_contract_id",
          populate: {
            path: "listing_id",
            select: "title address suburb"
          }
        })
        .populate("owner_id", "name email phone")
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
      .populate("owner_id", "name email phone")
      .populate({
        path: "current_contract_id",
        populate: {
          path: "listing_id",
          select: "title address suburb"
        }
      })
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

// Helper function to generate temporary password
const generateTempPassword = () => {
  const length = 10;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Create tenant
export const createTenant = async (req, res) => {
  try {
    const user = req.user;
    const { 
      create_user_account, 
      user_password, 
      create_contract,
      contract_data,
      ...tenantData 
    } = req.body;

    // Determine owner_id
    let ownerId = tenantData.owner_id;

    // If listing is provided, validate and get owner from listing
    if (tenantData.listing_id) {
      const listing = await Listing.findById(tenantData.listing_id);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }
      ownerId = listing.owner_id;
    } else if (user.role === "owner") {
      // If owner creates tenant without listing, use their owner_id
      ownerId = user.owner_id;
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "owner_id is required when no listing is provided",
      });
    }

    tenantData.owner_id = ownerId;
    
    // Determine initial status based on whether a contract will be created
    const listing_id_for_contract = tenantData.listing_id;
    tenantData.status = listing_id_for_contract ? "active" : "available";
    
    // Remove listing_id from tenant data (it's not part of tenant model anymore)
    delete tenantData.listing_id;

    // Create tenant
    const tenant = new Tenant(tenantData);
    await tenant.save();

    // If converted from lead, update lead status
    if (tenantData.converted_from_lead_id) {
      await Lead.findByIdAndUpdate(tenantData.converted_from_lead_id, {
        status: "converted",
      });
    }

    // Create contract if requested and has listing
    let contractInfo = null;
    if (create_contract && listing_id_for_contract) {
      try {
        const contractDetails = {
          tenant_id: tenant._id,
          listing_id: listing_id_for_contract,
          owner_id: ownerId,
          start_date: contract_data?.start_date || new Date(),
          end_date: contract_data?.end_date || new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months default
          weekly_rent: contract_data?.weekly_rent || 0,
          bond_amount: contract_data?.bond_amount || 0,
          bond_paid: contract_data?.bond_paid || false,
          payment_frequency: contract_data?.payment_frequency || "weekly",
          notice_period_days: contract_data?.notice_period_days || 14,
          terms: contract_data?.terms || {},
          status: contract_data?.status || "active",
          created_by: user._id,
        };

        const contract = new Contract(contractDetails);
        await contract.save();

        // Update tenant with contract reference
        tenant.current_contract_id = contract._id;
        tenant.status = contract.status;
        await tenant.save();

        // Update listing
        const listing = await Listing.findById(listing_id_for_contract);
        if (listing) {
          listing.status = "reserved";
          listing.tenant_id = tenant._id;
          await listing.save();
        }

        contractInfo = {
          contract_id: contract._id,
          message: "Contract created successfully",
        };
      } catch (contractError) {
        console.error("Error creating contract:", contractError);
        // Don't fail tenant creation if contract fails
        contractInfo = {
          error: "Contract creation failed",
          message: contractError.message,
        };
      }
    } else if (listing_id_for_contract) {
      // If listing provided but no contract, just update listing
      const listing = await Listing.findById(listing_id_for_contract);
      if (listing) {
        listing.tenant_id = tenant._id;
        await listing.save();
      }
    }

    // Create user account if requested
    let userInfo = null;
    if (create_user_account) {
      try {
        // Check if user already exists with this email
        const existingUser = await User.findOne({ email: tenantData.email });
        
        if (existingUser) {
          // Update existing user to link with tenant
          existingUser.tenant_id = tenant._id;
          existingUser.role = "tenant";
          await existingUser.save();
          
          userInfo = {
            email: existingUser.email,
            message: "User account already existed and was linked to tenant",
            password_reset_required: true,
          };
        } else {
          // Use provided password or generate one
          const password = user_password || generateTempPassword();
          const newUser = new User({
            email: tenantData.email,
            password: password,
            name: tenantData.name,
            role: "tenant",
            tenant_id: tenant._id,
            phone: tenantData.phone,
          });
          await newUser.save();
          
          userInfo = {
            email: newUser.email,
            temporary_password: password,
            message: "User account created successfully",
          };
        }
      } catch (userError) {
        console.error("Error creating user account:", userError);
        userInfo = {
          error: "User account creation failed",
          message: userError.message,
        };
      }
    }

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate("owner_id", "name email phone")
      .populate({
        path: "current_contract_id",
        populate: {
          path: "listing_id",
          select: "title address suburb"
        }
      });

    res.status(201).json({
      success: true,
      data: populatedTenant,
      user: userInfo,
      contract: contractInfo,
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

    // Get current tenant
    const currentTenant = await Tenant.findById(id);
    if (!currentTenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Update tenant (simple update of personal information)
    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("owner_id", "name email phone")
      .populate({
        path: "current_contract_id",
        populate: {
          path: "listing_id",
          select: "title address suburb"
        }
      });

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

    // Check if tenant has active contracts
    const activeContract = await Contract.findOne({
      tenant_id: id,
      status: { $in: ["active", "ending_soon"] },
    });

    if (activeContract) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete tenant with active contract. Terminate the contract first.",
      });
    }

    // Deactivate associated user account if exists
    try {
      const User = (await import('../models/User.js')).default;
      const userAccount = await User.findOne({ tenant_id: id });
      if (userAccount) {
        await User.findByIdAndUpdate(userAccount._id, { 
          isActive: false,
          tenant_id: null,
        });
        console.log(`Deactivated user account for tenant: ${tenant.email}`);
      }
    } catch (userError) {
      console.error('Error deactivating user account:', userError);
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
    const { 
      start_date, 
      end_date, 
      weekly_rent, 
      bond_amount,
      bond_paid,
      payment_frequency,
      bills_included,
      ...otherData 
    } = req.body;

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

    const listing = lead.listing_id;

    // Create tenant from lead data
    const tenantData = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      owner_id: listing.owner_id,
      converted_from_lead_id: leadId,
      notes: lead.message || "",
      status: "active",
      ...otherData,
    };

    const tenant = new Tenant(tenantData);
    await tenant.save();

    // Create contract for the tenant
    const contractData = {
      tenant_id: tenant._id,
      listing_id: listing._id,
      owner_id: listing.owner_id,
      start_date: start_date || new Date(),
      end_date: end_date || new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months default
      weekly_rent: weekly_rent || 0,
      bond_amount: bond_amount || 0,
      bond_paid: bond_paid || false,
      payment_frequency: payment_frequency || "weekly",
      bills_included: bills_included || false,
      notice_period_days: 14,
      status: "active",
      terms: {},
    };

    const contract = new Contract(contractData);
    await contract.save();

    // Update tenant with contract reference
    tenant.current_contract_id = contract._id;
    await tenant.save();

    // Update lead status
    lead.status = "converted";
    await lead.save();

    // Update listing status
    await Listing.findByIdAndUpdate(listing._id, {
      status: "reserved",
      tenant_id: tenant._id,
    });

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate("owner_id", "name email phone")
      .populate({
        path: "current_contract_id",
        populate: {
          path: "listing_id",
          select: "title address suburb"
        }
      });

    res.status(201).json({
      success: true,
      data: populatedTenant,
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

    // Find contracts ending soon
    const endingContracts = await Contract.find({
      status: { $in: ["active", "ending_soon"] },
      end_date: { $lte: thirtyDaysFromNow, $gte: new Date() },
    })
      .populate({
        path: "tenant_id",
        populate: {
          path: "owner_id",
          select: "name email phone"
        }
      })
      .populate("listing_id", "title address")
      .sort({ end_date: 1 });

    // Extract tenants from contracts
    const tenants = endingContracts
      .filter(contract => contract.tenant_id)
      .map(contract => ({
        ...contract.tenant_id.toObject(),
        contract_end_date: contract.end_date,
        contract_id: contract._id,
        listing: contract.listing_id,
      }));

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

// Unlink tenant from listing (terminates active contract)
export const unlinkTenantFromListing = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Find and terminate active contract
    const activeContract = await Contract.findOne({
      tenant_id: id,
      status: { $in: ["active", "ending_soon"] },
    });

    if (activeContract) {
      activeContract.status = "terminated";
      activeContract.termination_reason = "Unlinked by user";
      activeContract.termination_date = new Date();
      await activeContract.save();
    }

    // Update tenant
    tenant.current_contract_id = null;
    tenant.status = "ended";
    await tenant.save();

    res.json({
      success: true,
      data: tenant,
      message: "Tenant unlinked and contract terminated successfully",
    });
  } catch (error) {
    console.error("Unlink tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
