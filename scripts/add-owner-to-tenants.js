import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';
import Listing from '../src/models/Listing.js';
import Owner from '../src/models/Owner.js';
import dotenv from 'dotenv';

dotenv.config();

const addOwnerToTenants = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all tenants
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants`);

    // Get first owner as default (for tenants without listing)
    const defaultOwner = await Owner.findOne({});
    console.log(`Default owner: ${defaultOwner?.name} (${defaultOwner?._id})`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const tenant of tenants) {
      try {
        // Skip if already has owner_id
        if (tenant.owner_id) {
          console.log(`Tenant ${tenant.name} already has owner_id, skipping`);
          skipped++;
          continue;
        }

        let ownerId = null;

        // Try to get owner_id from listing first
        if (tenant.listing_id) {
          const listing = await Listing.findById(tenant.listing_id);
          if (listing && listing.owner_id) {
            ownerId = listing.owner_id;
            console.log(`Found owner_id from listing for ${tenant.name}`);
          }
        }

        // If no owner_id from listing, use default owner
        if (!ownerId && defaultOwner) {
          ownerId = defaultOwner._id;
          console.log(`Using default owner for ${tenant.name} (no listing)`);
        }

        if (ownerId) {
          tenant.owner_id = ownerId;
          await tenant.save();
          console.log(`✓ Updated tenant ${tenant.name} with owner_id`);
          updated++;
        } else {
          console.log(`✗ No owner_id found for tenant ${tenant.name}`);
          errors++;
        }
      } catch (err) {
        console.error(`Error updating tenant ${tenant.name}:`, err.message);
        errors++;
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total tenants: ${tenants.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had owner_id): ${skipped}`);
    console.log(`Errors: ${errors}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

addOwnerToTenants();
