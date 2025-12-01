import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';
import Contract from '../src/models/Contract.js';
import Listing from '../src/models/Listing.js';
import Owner from '../src/models/Owner.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function migrateTenants() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get raw collection to access 'listing_id' even if removed from Schema
        const tenantsCollection = mongoose.connection.db.collection('tenants');
        const allTenants = await tenantsCollection.find({}).toArray();

        console.log(`Found ${allTenants.length} tenants to check.`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const tenantDoc of allTenants) {
            try {
                // Check if migration is needed
                // 1. Has listing_id (legacy field)
                // 2. Does NOT have current_contract_id (new field)
                if (tenantDoc.listing_id && !tenantDoc.current_contract_id) {
                    console.log(`Migrating tenant: ${tenantDoc.name} (${tenantDoc._id})`);

                    // Fetch Listing to get owner_id
                    const listing = await Listing.findById(tenantDoc.listing_id);
                    if (!listing) {
                        console.warn(`  Listing not found for tenant ${tenantDoc.name}. Skipping.`);
                        errorCount++;
                        continue;
                    }

                    // Create Contract
                    const contractData = {
                        tenant_id: tenantDoc._id,
                        listing_id: tenantDoc.listing_id,
                        owner_id: listing.owner_id,
                        start_date: tenantDoc.lease_start || new Date(),
                        end_date: tenantDoc.lease_end || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // Default 6 months
                        weekly_rent: tenantDoc.weekly_rent || listing.price_per_week || 0,
                        bond_amount: tenantDoc.bond_paid || (tenantDoc.weekly_rent ? tenantDoc.weekly_rent * 4 : 0),
                        bond_paid: !!tenantDoc.bond_paid,
                        status: tenantDoc.status === 'active' ? 'active' : 'ended', // Map status
                        payment_frequency: 'weekly'
                    };

                    const contract = await Contract.create(contractData);
                    console.log(`  Created Contract: ${contract._id}`);

                    // Update Tenant
                    await tenantsCollection.updateOne(
                        { _id: tenantDoc._id },
                        {
                            $set: { current_contract_id: contract._id },
                            $unset: { listing_id: "" } // Remove legacy field
                        }
                    );
                    console.log(`  Updated Tenant with contract link and removed listing_id.`);
                    migratedCount++;

                } else if (tenantDoc.current_contract_id && tenantDoc.listing_id) {
                    // Case: Has contract but still has legacy listing_id
                    console.log(`Cleaning up tenant: ${tenantDoc.name} (${tenantDoc._id}) - Removing legacy listing_id`);
                    await tenantsCollection.updateOne(
                        { _id: tenantDoc._id },
                        { $unset: { listing_id: "" } }
                    );
                    migratedCount++;
                } else {
                    skippedCount++;
                }
            } catch (err) {
                console.error(`Error migrating tenant ${tenantDoc._id}:`, err);
                errorCount++;
            }
        }

        console.log('\nMigration Summary:');
        console.log(`Total Tenants: ${allTenants.length}`);
        console.log(`Migrated/Fixed: ${migratedCount}`);
        console.log(`Skipped (Already correct): ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrateTenants();
