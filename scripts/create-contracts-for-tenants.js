import * as dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Tenant from "../src/models/Tenant.js";
import Contract from "../src/models/Contract.js";
import Listing from "../src/models/Listing.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function createContractsForExistingTenants() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all tenants that have a listing_id but no contract
    const tenants = await Tenant.find({
      listing_id: { $exists: true, $ne: null },
      current_contract_id: { $exists: false },
    }).populate("listing_id");

    console.log(`📋 Found ${tenants.length} tenants without contracts\n`);

    let created = 0;

    for (const tenant of tenants) {
      try {
        console.log(`\n🔄 Processing tenant: ${tenant.name} (${tenant.email})`);

        if (!tenant.listing_id) {
          console.log(`   ⏭️  No listing assigned, skipping...`);
          continue;
        }

        const listing = tenant.listing_id;
        
        // Check if contract already exists
        const existingContract = await Contract.findOne({
          tenant_id: tenant._id,
          listing_id: listing._id,
          status: { $in: ["active", "ending_soon"] },
        });

        if (existingContract) {
          console.log(`   ⏭️  Active contract already exists, updating tenant...`);
          tenant.current_contract_id = existingContract._id;
          tenant.status = existingContract.status;
          await tenant.save();
          continue;
        }

        // Create contract with default values
        const today = new Date();
        const startDate = new Date(today);
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 6); // 6 months lease

        const contract = new Contract({
          tenant_id: tenant._id,
          listing_id: listing._id,
          owner_id: tenant.owner_id || listing.owner_id,
          signed_date: today,
          start_date: startDate,
          end_date: endDate,
          weekly_rent: listing.weekly_rent || 300, // Use listing rent or default
          bond_amount: (listing.weekly_rent || 300) * 4, // 4 weeks bond
          bond_paid: true,
          payment_frequency: "weekly",
          status: "active",
          notice_period_days: 14,
          terms: {
            pets_allowed: false,
            smoking_allowed: false,
            parking_spaces: 0,
            special_conditions: tenant.notes || "",
          },
          documents: [],
        });

        await contract.save();
        console.log(`   ✅ Created contract`);
        console.log(`      Start: ${startDate.toLocaleDateString()}`);
        console.log(`      End: ${endDate.toLocaleDateString()}`);
        console.log(`      Weekly Rent: $${contract.weekly_rent}`);
        console.log(`      Bond: $${contract.bond_amount}`);

        // Update tenant
        tenant.current_contract_id = contract._id;
        tenant.status = "active";
        await tenant.save();
        console.log(`   ✅ Updated tenant with contract reference`);

        // Update listing
        if (listing.status !== "reserved" && listing.status !== "rented") {
          listing.status = "reserved";
          listing.tenant_id = tenant._id;
          await listing.save();
          console.log(`   ✅ Updated listing status to reserved`);
        }

        created++;
      } catch (error) {
        console.error(`   ❌ Error processing tenant ${tenant.name}:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Summary:");
    console.log("=".repeat(50));
    console.log(`✅ Contracts created: ${created}`);
    console.log(`📋 Total processed: ${tenants.length}`);
    console.log("=".repeat(50) + "\n");

    console.log("✅ Migration completed successfully!\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

createContractsForExistingTenants();
