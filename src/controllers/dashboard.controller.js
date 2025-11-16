import Listing from "../models/Listing.js";
import Lead from "../models/Lead.js";
import Partner from "../models/Partner.js";
import Tenant from "../models/Tenant.js";

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
        totalPartners,
        activePartners,
        totalTenants,
        activeTenants,
        tenantsEndingSoon,
      ] = await Promise.all([
        Listing.countDocuments(),
        Listing.countDocuments({ status: "published" }),
        Lead.countDocuments(),
        Lead.countDocuments({ status: "new" }),
        Partner.countDocuments(),
        Partner.countDocuments({ isActive: true }),
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
        .populate("owner_partner_id", "name email");

      const recentTenants = await Tenant.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("listing_id", "title address");

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
          partners: {
            total: totalPartners,
            active: activePartners,
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

      const [
        totalListings,
        activeListings,
        totalTenants,
        activeTenants,
        tenantsEndingSoon,
      ] = await Promise.all([
        Listing.countDocuments({ owner_partner_id: user.partner_id }),
        Listing.countDocuments({
          owner_partner_id: user.partner_id,
          status: "published",
        }),
        Tenant.countDocuments({ listing_id: { $in: listingIds } }),
        Tenant.countDocuments({
          listing_id: { $in: listingIds },
          status: "active",
        }),
        Tenant.countDocuments({
          listing_id: { $in: listingIds },
          status: "ending_soon",
        }),
      ]);

      const recentListings = await Listing.find({
        owner_partner_id: user.partner_id,
      })
        .sort({ createdAt: -1 })
        .limit(5);

      const recentTenants = await Tenant.find({
        listing_id: { $in: listingIds },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("listing_id", "title address");

      // Calcular ingresos mensuales (suma de weekly_rent * 4)
      const activeTenantsList = await Tenant.find({
        listing_id: { $in: listingIds },
        status: "active",
      });
      const monthlyIncome = activeTenantsList.reduce(
        (sum, tenant) => sum + tenant.weekly_rent * 4,
        0
      );

      statsData = {
        stats: {
          listings: {
            total: totalListings,
            active: activeListings,
          },
          tenants: {
            total: totalTenants,
            active: activeTenants,
            ending_soon: tenantsEndingSoon,
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

      const tenantData = await Tenant.findById(user.tenant_id).populate(
        "listing_id",
        "title address images"
      );

      if (!tenantData) {
        return res.status(404).json({
          success: false,
          message: "Tenant data not found",
        });
      }

      // Calcular próximo pago (asumiendo pagos semanales)
      const today = new Date();
      const leaseStart = new Date(tenantData.lease_start);
      const daysSinceStart = Math.floor(
        (today - leaseStart) / (1000 * 60 * 60 * 24)
      );
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      const daysUntilNextPayment = 7 - (daysSinceStart % 7);
      const nextPaymentDate = new Date(today);
      nextPaymentDate.setDate(today.getDate() + daysUntilNextPayment);

      statsData = {
        stats: {
          tenant: {
            status: tenantData.status,
            weekly_rent: tenantData.weekly_rent,
            bond_paid: tenantData.bond_paid,
            lease_start: tenantData.lease_start,
            lease_end: tenantData.lease_end,
            days_remaining: tenantData.days_remaining,
          },
          property: {
            title: tenantData.listing_id?.title,
            address: tenantData.listing_id?.address,
            images: tenantData.listing_id?.images || [],
          },
          nextPayment: {
            date: nextPaymentDate,
            amount: tenantData.weekly_rent,
            daysUntil: daysUntilNextPayment,
          },
        },
        tenantData,
      };
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
