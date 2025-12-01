import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';
import Contract from '../src/models/Contract.js';
import Listing from '../src/models/Listing.js';
import Owner from '../src/models/Owner.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function checkConsistency() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('\n--- Checking Tenants ---');
        const tenants = await Tenant.find({});
        for (const tenant of tenants) {
            const issues = [];
            // Check 1: Legacy listing_id
            const rawTenant = tenant.toObject();
            if (rawTenant.listing_id) issues.push('Has legacy listing_id');

            // Check 2: Active but no contract
            if (tenant.status === 'active' && !tenant.current_contract_id) {
                issues.push('Status is active but no current_contract_id');
            }

            // Check 3: Contract existence
            if (tenant.current_contract_id) {
                const contract = await Contract.findById(tenant.current_contract_id);
                if (!contract) issues.push(`current_contract_id ${tenant.current_contract_id} not found`);
            }

            if (issues.length > 0) {
                console.log(`Tenant ${tenant.name} (${tenant._id}):`, issues.join(', '));
            }
        }

        console.log('\n--- Checking Contracts ---');
        const contracts = await Contract.find({});
        for (const contract of contracts) {
            const issues = [];

            // Check 1: Valid Listing
            if (!contract.listing_id) issues.push('Missing listing_id');
            else {
                const listing = await Listing.findById(contract.listing_id);
                if (!listing) issues.push(`listing_id ${contract.listing_id} not found`);
            }

            // Check 2: Valid Owner
            if (!contract.owner_id) issues.push('Missing owner_id');
            else {
                const owner = await Owner.findById(contract.owner_id);
                if (!owner) issues.push(`owner_id ${contract.owner_id} not found`);
            }

            // Check 3: Valid Tenant (if assigned)
            if (contract.tenant_id) {
                const tenant = await Tenant.findById(contract.tenant_id);
                if (!tenant) issues.push(`tenant_id ${contract.tenant_id} not found`);
                else {
                    // Check reverse link
                    if (contract.status === 'active' && (!tenant.current_contract_id || tenant.current_contract_id.toString() !== contract._id.toString())) {
                        issues.push(`Tenant ${tenant._id} does not point back to this active contract`);
                    }
                }
            }

            if (issues.length > 0) {
                console.log(`Contract ${contract._id}:`, issues.join(', '));
            }
        }

        console.log('\n--- Checking Listings ---');
        const listings = await Listing.find({});
        for (const listing of listings) {
            const issues = [];
            if (!listing.owner_id) issues.push('Missing owner_id');
            else {
                const owner = await Owner.findById(listing.owner_id);
                if (!owner) issues.push(`owner_id ${listing.owner_id} not found`);
            }

            if (issues.length > 0) {
                console.log(`Listing ${listing.title} (${listing._id}):`, issues.join(', '));
            }
        }

        console.log('\nConsistency Check Complete.');

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkConsistency();
