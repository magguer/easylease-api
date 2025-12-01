import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';
import Contract from '../src/models/Contract.js';
import Listing from '../src/models/Listing.js';
import Owner from '../src/models/Owner.js';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function verifyRefactor() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create a dummy owner
        const owner = await Owner.create({
            name: "Test Owner",
            email: `testowner_${Date.now()}@example.com`,
            phone: "1234567890"
        });
        console.log('Created Owner:', owner._id);

        // 2. Create a dummy listing
        const listing = await Listing.create({
            title: "Test Listing",
            address: "123 Test St",
            owner_id: owner._id,
            room_type: "single"
        });
        console.log('Created Listing:', listing._id);

        // 3. Create a dummy user (manager) to simulate req.user
        const user = await User.create({
            name: "Test Manager",
            email: `manager_${Date.now()}@example.com`,
            password: "password123",
            role: "manager"
        });
        console.log('Created User:', user._id);

        // 4. Simulate createTenant controller logic
        // We can't call the controller directly easily without mocking req/res, 
        // so we'll replicate the core logic we changed.

        const tenantData = {
            name: "Test Tenant",
            email: `tenant_${Date.now()}@example.com`,
            phone: "0987654321",
            owner_id: owner._id,
            listing_id: listing._id, // Passed in body
            status: "available"
        };

        // Logic from createTenant:
        // Create tenant (without listing_id)
        const tenant = new Tenant({
            name: tenantData.name,
            email: tenantData.email,
            phone: tenantData.phone,
            owner_id: tenantData.owner_id,
            status: tenantData.status
        });
        await tenant.save();
        console.log('Created Tenant:', tenant._id);

        // Create contract
        const contractDetails = {
            tenant_id: tenant._id,
            listing_id: tenantData.listing_id,
            owner_id: tenantData.owner_id,
            start_date: new Date(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            weekly_rent: 500,
            bond_amount: 2000,
            status: "active",
            created_by: user._id
        };

        const contract = new Contract(contractDetails);
        await contract.save();
        console.log('Created Contract:', contract._id);

        // Update tenant
        tenant.current_contract_id = contract._id;
        tenant.status = contract.status;
        await tenant.save();
        console.log('Updated Tenant with Contract');

        // 5. Verify fetching tenant populates listing via contract
        const fetchedTenant = await Tenant.findById(tenant._id)
            .populate({
                path: "current_contract_id",
                populate: { path: "listing_id", select: "title address" }
            });

        console.log('Fetched Tenant Contract:', fetchedTenant.current_contract_id._id);
        if (fetchedTenant.current_contract_id.listing_id && fetchedTenant.current_contract_id.listing_id._id.toString() === listing._id.toString()) {
            console.log('SUCCESS: Tenant linked to Listing via Contract');
        } else {
            console.error('FAILURE: Listing not populated correctly via Contract');
            console.log('Contract:', fetchedTenant.current_contract_id);
        }

        // Cleanup
        await Contract.deleteMany({ _id: contract._id });
        await Tenant.deleteMany({ _id: tenant._id });
        await Listing.deleteMany({ _id: listing._id });
        await Owner.deleteMany({ _id: owner._id });
        await User.deleteMany({ _id: user._id });

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyRefactor();
