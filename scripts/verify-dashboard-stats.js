import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';
import Contract from '../src/models/Contract.js';
import Listing from '../src/models/Listing.js';
import Owner from '../src/models/Owner.js';
import Lead from '../src/models/Lead.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function verifyDashboardStats() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Setup Data
        const owner = await Owner.create({
            name: "Stats Owner",
            email: `stats_owner_${Date.now()}@example.com`,
            phone: "1234567890",
            status: "active"
        });

        const listing = await Listing.create({
            title: "Stats Listing",
            address: "Stats Address",
            owner_id: owner._id,
            status: "published",
            slug: `stats-listing-${Date.now()}`
        });

        const tenant = await Tenant.create({
            name: "Stats Tenant",
            email: `stats_tenant_${Date.now()}@example.com`,
            phone: "0987654321",
            status: "active",
            owner_id: owner._id
        });

        const contract = await Contract.create({
            tenant_id: tenant._id,
            listing_id: listing._id,
            owner_id: owner._id,
            start_date: new Date(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            weekly_rent: 500,
            bond_amount: 2000,
            status: "active"
        });

        tenant.current_contract_id = contract._id;
        await tenant.save();

        console.log('Data Setup Complete');

        // --- Verify Manager Stats Logic ---
        console.log('\n--- Manager Stats ---');
        const recentTenants = await Tenant.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({
                path: "current_contract_id",
                populate: { path: "listing_id", select: "title address" }
            });

        const tenantWithListing = recentTenants.find(t => t._id.toString() === tenant._id.toString());
        if (tenantWithListing && tenantWithListing.current_contract_id && tenantWithListing.current_contract_id.listing_id) {
            console.log('SUCCESS: Manager Recent Tenants populated correctly');
            console.log('Listing Title:', tenantWithListing.current_contract_id.listing_id.title);
        } else {
            console.error('FAILURE: Manager Recent Tenants population failed');
        }

        // --- Verify Owner Stats Logic ---
        console.log('\n--- Owner Stats ---');
        const listingIds = [listing._id];

        const activeContractsCount = await Contract.countDocuments({
            listing_id: { $in: listingIds },
            status: { $in: ["active", "ending_soon"] }
        });

        const totalContractsCount = await Contract.countDocuments({
            listing_id: { $in: listingIds }
        });

        console.log('Active Contracts:', activeContractsCount);
        console.log('Total Contracts:', totalContractsCount);

        if (activeContractsCount === 1 && totalContractsCount === 1) {
            console.log('SUCCESS: Owner Stats Counts correct');
        } else {
            console.error('FAILURE: Owner Stats Counts incorrect');
        }

        const recentContracts = await Contract.find({
            listing_id: { $in: listingIds }
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("tenant_id")
            .populate("listing_id", "title address");

        const recentTenantsOwner = recentContracts.map(c => {
            const t = c.tenant_id ? c.tenant_id.toObject() : {};
            t.current_contract_id = { listing_id: c.listing_id };
            return t;
        }).filter(t => t._id);

        if (recentTenantsOwner.length > 0 && recentTenantsOwner[0].current_contract_id.listing_id) {
            console.log('SUCCESS: Owner Recent Tenants populated correctly');
        } else {
            console.error('FAILURE: Owner Recent Tenants population failed');
        }

        // --- Verify Tenant Stats Logic ---
        console.log('\n--- Tenant Stats ---');
        const tenantData = await Tenant.findById(tenant._id)
            .populate({
                path: "current_contract_id",
                populate: { path: "listing_id", select: "title address images" }
            });

        if (tenantData.current_contract_id && tenantData.current_contract_id.listing_id) {
            console.log('SUCCESS: Tenant Dashboard Data populated correctly');
        } else {
            console.error('FAILURE: Tenant Dashboard Data population failed');
        }

        // Cleanup
        await Contract.deleteMany({ _id: contract._id });
        await Tenant.deleteMany({ _id: tenant._id });
        await Listing.deleteMany({ _id: listing._id });
        await Owner.deleteMany({ _id: owner._id });

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyDashboardStats();
