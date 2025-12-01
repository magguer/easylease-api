import Listing from "../models/Listing.js";
import Lead from "../models/Lead.js";
import Owner from "../models/Owner.js";
import Tenant from "../models/Tenant.js";
import Contract from "../models/Contract.js";

// Get dashboard statistics
export const getStats = async (req, res) => {
  try {
    const user = req.user;
    let statsData;

    // MANAGER: Ve todas las estadísticas
    if (user.role === "manager") {
      const [
        totalListings,
        activeListings,
        totalLeads,
        newLeads,
        totalOwners,
        activeOwners,
        totalTenants,
        activeTenants,
        tenantsEndingSoon,
      ] = await Promise.all([
        Listing.countDocuments(),
        Listing.countDocuments({ status: "published" }),
        Lead.countDocuments(),
        Lead.countDocuments({ status: "new" }),
        Owner.countDocuments(),
        Owner.countDocuments({ status: "active" }),
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: "active" }),
        Tenant.countDocuments({ status: "ending_soon" }),
      ]);

      const recentLeads = await Lead.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("listing_id", "title address");

      const recentListings = await Listing.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("owner_id", "name email");

      const recentTenants = await Tenant.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
          path: "current_contract_id",
          populate: { path: "listing_id", select: "title address" }
        });

      statsData = {
        stats: {
          listings: {
            total: totalListings,
            active: activeListings,
          },
          leads: {
            total: totalLeads,
            new: newLeads,
          },
          owners: {
            total: totalOwners,
            active: activeOwners,
          },
          tenants: {
            total: totalTenants,
            active: activeTenants,
            ending_soon: tenantsEndingSoon,
          },
        },
        recentLeads,
        recentListings,
        recentTenants,
      };
    }
    // OWNER: Solo ve sus propiedades e inquilinos
    else if (user.role === "owner") {
      if (!user.owner_id) {
        return res.status(400).json({
          success: false,
          message: "Owner must have a owner_id",
        });
      }

      // Obtener propiedades del owner
      const ownerListings = await Listing.find({
        owner_id: user.owner_id,
      });
      const listingIds = ownerListings.map((l) => l._id);

      // Use Contracts to find tenants for this owner
      const [
        totalListings,
        activeContractsCount,
        endingSoonContractsCount
      ] = await Promise.all([
        Listing.countDocuments({ owner_id: user.owner_id }),
        Contract.countDocuments({
          listing_id: { $in: listingIds },
          status: { $in: ["active", "ending_soon"] }
        }),
        Contract.countDocuments({
          listing_id: { $in: listingIds },
          status: "ending_soon"
        }),
      ]);

      // Count rented listings as those with active contracts
      const rentedListings = activeContractsCount;

      // Total tenants is roughly equal to total contracts (active + ended) for this owner
      // Or just active ones? The original code counted all tenants with listing_id.
      // Let's count all contracts for these listings.
      const totalContractsCount = await Contract.countDocuments({
        listing_id: { $in: listingIds }
      });

      const recentListings = await Listing.find({
        owner_id: user.owner_id,
      })
        .sort({ createdAt: -1 })
        .limit(5);

      // Get recent tenants via Contracts
      const recentContracts = await Contract.find({
        listing_id: { $in: listingIds }
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("tenant_id")
        .populate("listing_id", "title address");

      const recentTenants = recentContracts.map(c => {
        const tenant = c.tenant_id ? c.tenant_id.toObject() : {};
        tenant.current_contract_id = {
          listing_id: c.listing_id
        };
        return tenant;
      }).filter(t => t._id); // Filter out nulls

      // Calculate monthly income from active contracts
      const activeContracts = await Contract.find({
        listing_id: { $in: listingIds },
        status: "active",
      });

      const monthlyIncome = activeContracts.reduce(
        (sum, contract) => sum + (contract.weekly_rent || 0) * 4,
        0
      );

      statsData = {
        stats: {
          listings: {
            total: totalListings,
            active: rentedListings,
          },
          tenants: {
            total: totalContractsCount, // Approximation
            active: activeContractsCount,
            ending_soon: endingSoonContractsCount,
          },
          income: {
            monthly: monthlyIncome,
          },
        },
        recentListings,
        recentTenants,
      };
    }
    // TENANT: Solo ve su información de alquiler
    else if (user.role === "tenant") {
      if (!user.tenant_id) {
        return res.status(400).json({
          success: false,
          message: "Tenant must have a tenant_id",
        });
      }

      const tenantData = await Tenant.findById(user.tenant_id)
        .populate({
          path: "current_contract_id",
          populate: { path: "listing_id", select: "title address images" }
        });

      if (!tenantData) {
        return res.status(404).json({
          success: false,
          message: "Tenant data not found",
        });
      }

      // Get current contract
      const currentContract = tenantData.current_contract_id;

      if (!currentContract) {
        // No active contract
        statsData = {
          stats: {
            tenant: {
              status: "available",
            },
            property: null,
            nextPayment: null,
          },
          tenantData,
        };
      } else {
        // Has active contract - calculate next payment
        const today = new Date();
        const leaseStart = new Date(currentContract.start_date);
        const daysSinceStart = Math.floor(
          (today - leaseStart) / (1000 * 60 * 60 * 24)
        );

        let daysUntilNextPayment = 7;
        if (currentContract.payment_frequency === "fortnightly") {
          daysUntilNextPayment = 14 - (daysSinceStart % 14);
        } else if (currentContract.payment_frequency === "monthly") {
          // Approximate monthly as 30 days
          daysUntilNextPayment = 30 - (daysSinceStart % 30);
        } else {
          // Weekly (default)
          daysUntilNextPayment = 7 - (daysSinceStart % 7);
        }

        const nextPaymentDate = new Date(today);
        nextPaymentDate.setDate(today.getDate() + daysUntilNextPayment);

        statsData = {
          stats: {
            tenant: {
              status: currentContract.status,
              weekly_rent: currentContract.weekly_rent,
              bond_paid: currentContract.bond_paid,
              bond_amount: currentContract.bond_amount,
              lease_start: currentContract.start_date,
              lease_end: currentContract.end_date,
              days_remaining: currentContract.days_remaining,
              payment_frequency: currentContract.payment_frequency,
            },
            property: {
              title: currentContract.listing_id?.title,
              address: currentContract.listing_id?.address,
              images: currentContract.listing_id?.images || [],
            },
            nextPayment: {
              date: nextPaymentDate,
              amount: currentContract.weekly_rent,
              daysUntil: daysUntilNextPayment,
            },
          },
          tenantData,
        };
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid user role",
      });
    }

    res.json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
