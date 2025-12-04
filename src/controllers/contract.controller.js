import Contract from "../models/Contract.js";
import Tenant from "../models/Tenant.js";
import Listing from "../models/Listing.js";
import Owner from "../models/Owner.js";

// Get all contracts (with filters)
export const getAllContracts = async (req, res) => {
  try {
    const user = req.user;
    const { status, tenant_id, listing_id, owner_id } = req.query;

    let filter = {};

    // Filter by role
    if (user.role === "owner") {
      if (!user.owner_id) {
        return res.status(400).json({
          success: false,
          message: "Owner must have an owner_id",
        });
      }
      filter.owner_id = user.owner_id;
    } else if (user.role === "tenant") {
      if (!user.tenant_id) {
        return res.status(400).json({
          success: false,
          message: "Tenant must have a tenant_id",
        });
      }
      filter.tenant_id = user.tenant_id;
    }
    // Manager can see all

    // Additional filters
    if (status) filter.status = status;
    if (tenant_id) filter.tenant_id = tenant_id;
    if (listing_id) filter.listing_id = listing_id;
    if (owner_id) filter.owner_id = owner_id;

    const contracts = await Contract.find(filter)
      .populate("tenant_id", "name email phone")
      .populate("listing_id", "title address images")
      .populate("owner_id", "name email phone")
      .populate("created_by", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: contracts,
    });
  } catch (error) {
    console.error("Get contracts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get contract by ID
export const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const contract = await Contract.findById(id)
      .populate("tenant_id", "name email phone")
      .populate("listing_id", "title address images bedrooms bathrooms weekly_rent")
      .populate("owner_id", "name email phone")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role === "owner" && contract.owner_id._id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this contract",
      });
    }

    if (user.role === "tenant" && contract.tenant_id._id.toString() !== user.tenant_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this contract",
      });
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error("Get contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create contract
export const createContract = async (req, res) => {
  try {
    const user = req.user;
    const {
      tenant_id, // Opcional - puede asignarse después
      listing_id,
      start_date,
      end_date,
      weekly_rent,
      bond_amount,
      bond_paid,
      payment_frequency,
      notice_period_days,
      terms,
      status,
    } = req.body;

    // Verify listing exists
    const listing = await Listing.findById(listing_id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Get owner from listing
    const owner_id = listing.owner_id;

    // Check permissions
    if (user.role === "owner" && owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create contract for this property",
      });
    }

    // If tenant_id is provided, verify tenant exists
    let tenant = null;
    if (tenant_id) {
      tenant = await Tenant.findById(tenant_id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found",
        });
      }

      // Check if tenant already has an active contract
      const tenantActiveContract = await Contract.findOne({
        tenant_id,
        status: { $in: ["active", "ending_soon"] },
      });

      if (tenantActiveContract) {
        return res.status(400).json({
          success: false,
          message: "This tenant already has an active contract",
        });
      }
    }

    // Check if there's already an active contract for this listing
    const existingContract = await Contract.findOne({
      listing_id,
      status: { $in: ["active", "ending_soon"] },
    });

    if (existingContract) {
      return res.status(400).json({
        success: false,
        message: "This property already has an active contract",
      });
    }

    // Create contract
    const contract = new Contract({
      tenant_id: tenant_id || null,
      listing_id,
      owner_id,
      start_date,
      end_date,
      weekly_rent,
      bond_amount,
      bond_paid: bond_paid || false,
      payment_frequency: payment_frequency || "weekly",
      notice_period_days: notice_period_days || 14,
      terms: terms || {},
      status: status || "draft",
      created_by: user._id,
    });

    await contract.save();

    // Update listing and tenant status only if tenant is assigned and status is active
    if (tenant_id && contract.status === "active") {
      listing.status = "reserved";
      listing.tenant_id = tenant_id;
      await listing.save();

      // Update tenant
      tenant.current_contract_id = contract._id;
      tenant.status = "active";
      await tenant.save();
    }

    const populatedContract = await Contract.findById(contract._id)
      .populate("tenant_id", "name email phone")
      .populate("listing_id", "title address")
      .populate("owner_id", "name email phone");

    res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: populatedContract,
    });
  } catch (error) {
    console.error("Create contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update contract
export const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updates = req.body;

    const contract = await Contract.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role === "owner" && contract.owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this contract",
      });
    }

    // Track status change
    const oldStatus = contract.status;
    const newStatus = updates.status || oldStatus;

    // Update fields
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "created_by") {
        contract[key] = updates[key];
      }
    });

    contract.updated_by = user._id;
    await contract.save();

    // Handle status changes
    if (oldStatus !== newStatus) {
      const listing = await Listing.findById(contract.listing_id);
      const tenant = contract.tenant_id ? await Tenant.findById(contract.tenant_id) : null;

      // Draft -> Available: Contract is ready to be published (has terms but no tenant)
      if (newStatus === "available" && oldStatus === "draft") {
        // No additional actions needed
      }
      
      // Available/Draft -> Active: Tenant is assigned and contract starts
      else if (newStatus === "active" && (oldStatus === "draft" || oldStatus === "available")) {
        if (!tenant) {
          return res.status(400).json({
            success: false,
            message: "Cannot activate contract without a tenant assigned",
          });
        }
        
        if (listing) {
          listing.status = "reserved";
          listing.tenant_id = tenant._id;
          await listing.save();
        }
        if (tenant) {
          tenant.current_contract_id = contract._id;
          tenant.status = "active";
          await tenant.save();
        }
      }
      
      // Active -> Ending Soon: Automatically handled by middleware based on days remaining
      
      // Active/Ending Soon -> Ended/Terminated: Contract finishes
      else if ((newStatus === "ended" || newStatus === "terminated") && 
               (oldStatus === "active" || oldStatus === "ending_soon")) {
        contract.termination_date = new Date();
        await contract.save();

        if (listing) {
          listing.status = "published";
          listing.tenant_id = null;
          await listing.save();
        }
        if (tenant) {
          tenant.current_contract_id = null;
          tenant.status = "ended";
          await tenant.save();
        }
      }
    }

    const updatedContract = await Contract.findById(contract._id)
      .populate("tenant_id", "name email phone")
      .populate("listing_id", "title address")
      .populate("owner_id", "name email phone");

    res.json({
      success: true,
      message: "Contract updated successfully",
      data: updatedContract,
    });
  } catch (error) {
    console.error("Update contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete contract
export const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const contract = await Contract.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can delete contracts",
      });
    }

    // Only allow deletion of draft contracts
    if (contract.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft contracts can be deleted. Terminate active contracts instead.",
      });
    }

    await Contract.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Contract deleted successfully",
    });
  } catch (error) {
    console.error("Delete contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Add document to contract
export const addDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { type, name, url } = req.body;

    const contract = await Contract.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role === "owner" && contract.owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add documents to this contract",
      });
    }

    contract.documents.push({
      type,
      name,
      url,
      uploaded_by: user._id,
      uploaded_at: new Date(),
    });

    await contract.save();

    res.json({
      success: true,
      message: "Document added successfully",
      data: contract,
    });
  } catch (error) {
    console.error("Add document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Remove document from contract
export const removeDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const user = req.user;

    const contract = await Contract.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role === "owner" && contract.owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to remove documents from this contract",
      });
    }

    contract.documents = contract.documents.filter(
      (doc) => doc._id.toString() !== documentId
    );

    await contract.save();

    res.json({
      success: true,
      message: "Document removed successfully",
      data: contract,
    });
  } catch (error) {
    console.error("Remove document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Assign tenant to contract
export const assignTenantToContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { tenant_id } = req.body;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    // Find contract
    const contract = await Contract.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check if contract already has a tenant
    if (contract.tenant_id) {
      return res.status(400).json({
        success: false,
        message: "Contract already has a tenant assigned",
      });
    }

    // Check permissions
    if (user.role === "owner" && contract.owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this contract",
      });
    }

    // Verify tenant exists
    const tenant = await Tenant.findById(tenant_id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Check if tenant already has an active contract
    const tenantActiveContract = await Contract.findOne({
      tenant_id,
      status: { $in: ["active", "ending_soon"] },
    });

    if (tenantActiveContract) {
      return res.status(400).json({
        success: false,
        message: "This tenant already has an active contract",
      });
    }

    // Assign tenant to contract
    contract.tenant_id = tenant_id;
    contract.updated_by = user._id;
    await contract.save();

    // If contract is active, update tenant and listing
    if (contract.status === "active") {
      const listing = await Listing.findById(contract.listing_id);
      if (listing) {
        listing.status = "reserved";
        listing.tenant_id = tenant_id;
        await listing.save();
      }

      tenant.current_contract_id = contract._id;
      tenant.status = "active";
      await tenant.save();
    }

    const updatedContract = await Contract.findById(contract._id)
      .populate("tenant_id", "name email phone")
      .populate("listing_id", "title address")
      .populate("owner_id", "name email phone");

    res.json({
      success: true,
      message: "Tenant assigned to contract successfully",
      data: updatedContract,
    });
  } catch (error) {
    console.error("Assign tenant to contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Terminate contract
export const terminateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { termination_reason } = req.body;

    const contract = await Contract.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role === "owner" && contract.owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to terminate this contract",
      });
    }

    if (contract.status === "ended" || contract.status === "terminated") {
      return res.status(400).json({
        success: false,
        message: "Contract is already terminated",
      });
    }

    // Update contract
    contract.status = "terminated";
    contract.termination_reason = termination_reason || "";
    contract.termination_date = new Date();
    contract.updated_by = user._id;
    await contract.save();

    // Update listing
    const listing = await Listing.findById(contract.listing_id);
    if (listing) {
      listing.status = "published";
      listing.tenant_id = null;
      await listing.save();
    }

    // Update tenant
    const tenant = await Tenant.findById(contract.tenant_id);
    if (tenant) {
      tenant.current_contract_id = null;
      tenant.status = "ended";
      await tenant.save();
    }

    const updatedContract = await Contract.findById(contract._id)
      .populate("tenant_id", "name email phone")
      .populate("listing_id", "title address")
      .populate("owner_id", "name email phone");

    res.json({
      success: true,
      message: "Contract terminated successfully",
      data: updatedContract,
    });
  } catch (error) {
    console.error("Terminate contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Restart contract (reactivate terminated contract)
export const restartContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const contract = await Contract.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role === "owner" && contract.owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to restart this contract",
      });
    }

    if (contract.status !== "terminated") {
      return res.status(400).json({
        success: false,
        message: "Only terminated contracts can be restarted",
      });
    }

    // Update contract status back to active
    contract.status = "active";
    contract.termination_reason = undefined;
    contract.termination_date = undefined;
    contract.updated_by = user._id;
    await contract.save();

    // Update tenant status if exists
    if (contract.tenant_id) {
      const tenant = await Tenant.findById(contract.tenant_id);
      if (tenant) {
        tenant.current_contract_id = contract._id;
        tenant.status = "active";
        await tenant.save();
      }
    }

    const updatedContract = await Contract.findById(contract._id)
      .populate("tenant_id", "name email phone")
      .populate("listing_id", "title address")
      .populate("owner_id", "name email phone");

    res.json({
      success: true,
      message: "Contract restarted successfully",
      data: updatedContract,
    });
  } catch (error) {
    console.error("Restart contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Duplicate/Replicate contract (create a new draft based on existing contract)
export const duplicateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { start_date, end_date } = req.body;

    // Validate required fields
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    // Find the original contract
    const originalContract = await Contract.findById(id);
    if (!originalContract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    // Check permissions
    if (user.role === "owner" && originalContract.owner_id.toString() !== user.owner_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to duplicate this contract",
      });
    }

    // Check if there's already an active or draft contract for this listing
    const existingContract = await Contract.findOne({
      listing_id: originalContract.listing_id,
      status: { $in: ["active", "ending_soon", "draft", "available"] },
    });

    if (existingContract) {
      return res.status(400).json({
        success: false,
        message: "This property already has an active, available, or draft contract. Terminate or delete it first.",
      });
    }

    // Create new contract based on original
    const newContract = new Contract({
      listing_id: originalContract.listing_id,
      owner_id: originalContract.owner_id,
      tenant_id: null, // New contract starts without tenant
      status: "available", // Available for rent (ready to accept tenant)
      
      // Financial terms (copy from original)
      weekly_rent: originalContract.weekly_rent,
      bond_amount: originalContract.bond_amount,
      bond_paid: false, // Reset bond payment
      payment_frequency: originalContract.payment_frequency,
      bills_included: originalContract.bills_included,
      
      // Dates (use provided dates)
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      signed_date: new Date(),
      
      // Terms (copy from original)
      notice_period_days: originalContract.notice_period_days,
      terms: {
        pets_allowed: originalContract.terms?.pets_allowed || false,
        smoking_allowed: originalContract.terms?.smoking_allowed || false,
        parking_spaces: originalContract.terms?.parking_spaces || 0,
        special_conditions: originalContract.terms?.special_conditions || "",
      },
      
      // Metadata
      created_by: user._id,
    });

    await newContract.save();

    const populatedContract = await Contract.findById(newContract._id)
      .populate("listing_id", "title address images")
      .populate("owner_id", "name email phone");

    res.status(201).json({
      success: true,
      message: "Contract duplicated successfully. New draft contract created.",
      data: populatedContract,
    });
  } catch (error) {
    console.error("Duplicate contract error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
