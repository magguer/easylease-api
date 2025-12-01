import * as dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Tenant from "../src/models/Tenant.js";
import Contract from "../src/models/Contract.js";
import Listing from "../src/models/Listing.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function migrateTenantsToContracts() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all tenants that have lease information
    const tenants = await Tenant.find({
      lease_start: { $exists: true },
      lease_end: { $exists: true },
      weekly_rent: { $exists: true },
    });

    console.log(`📋 Found ${tenants.length} tenants to migrate\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const tenant of tenants) {
      try {
        console.log(`\n🔄 Processing tenant: ${tenant.name} (${tenant.email})`);

        // Check if contract already exists
        const existingContract = await Contract.findOne({
          tenant_id: tenant._id,
          listing_id: tenant.listing_id,
          start_date: tenant.lease_start,
        });

        if (existingContract) {
          console.log(`   ⏭️  Contract already exists, skipping...`);
          skipped++;
          
          // Update tenant with contract reference
          tenant.current_contract_id = existingContract._id;
          await tenant.save();
          continue;
        }

        // Verify listing exists
        if (tenant.listing_id) {
          const listing = await Listing.findById(tenant.listing_id);
          if (!listing) {
            console.log(`   ⚠️  Listing not found, skipping...`);
            skipped++;
            continue;
          }
        }

        // Determine contract status based on tenant status and dates
        let contractStatus = "active";
        const today = new Date();
        const leaseEnd = new Date(tenant.lease_end);
        const daysRemaining = Math.ceil((leaseEnd - today) / (1000 * 60 * 60 * 24));

        if (tenant.status === "ended" || tenant.status === "terminated") {
          contractStatus = tenant.status;
        } else if (daysRemaining <= 0) {
          contractStatus = "ended";
        } else if (daysRemaining <= 30) {
          contractStatus = "ending_soon";
        }

        // Create contract from tenant data
        const contract = new Contract({
          tenant_id: tenant._id,
          listing_id: tenant.listing_id,
          owner_id: tenant.owner_id,
          signed_date: tenant.createdAt || new Date(),
          start_date: tenant.lease_start,
          end_date: tenant.lease_end,
          weekly_rent: tenant.weekly_rent,
          bond_amount: tenant.bond_paid || 0,
          bond_paid: tenant.bond_paid > 0,
          payment_frequency: "weekly",
          status: contractStatus,
          terms: {
            pets_allowed: false,
            smoking_allowed: false,
            parking_spaces: 0,
            special_conditions: tenant.notes || "",
          },
          documents: [],
        });

        await contract.save();
        console.log(`   ✅ Created contract with status: ${contractStatus}`);

        // Update tenant with contract reference and clean status
        tenant.current_contract_id = contract._id;
        tenant.status = contractStatus === "ended" || contractStatus === "terminated" ? "ended" : contractStatus;
        
        // Keep old fields for now (will remove in next migration)
        // Don't delete lease_start, lease_end, etc. yet
        
        await tenant.save();
        console.log(`   ✅ Updated tenant with contract reference`);

        created++;
      } catch (error) {
        console.error(`   ❌ Error processing tenant ${tenant.name}:`, error.message);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(50));
    console.log(`✅ Contracts created: ${created}`);
    console.log(`⏭️  Skipped (already exist): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total processed: ${tenants.length}`);
    console.log("=".repeat(50) + "\n");

    // Migrate lease history to separate contracts
    console.log("\n🔄 Migrating lease history...\n");
    const tenantsWithHistory = await Tenant.find({
      lease_history: { $exists: true, $ne: [] },
    });

    console.log(`📋 Found ${tenantsWithHistory.length} tenants with history\n`);

    let historyCreated = 0;
    let historySkipped = 0;

    for (const tenant of tenantsWithHistory) {
      console.log(`\n🔄 Processing history for: ${tenant.name}`);
      
      if (!tenant.lease_history || tenant.lease_history.length === 0) {
        continue;
      }

      for (const history of tenant.lease_history) {
        try {
          // Check if contract already exists for this history entry
          const existingHistoryContract = await Contract.findOne({
            tenant_id: tenant._id,
            listing_id: history.listing_id,
            start_date: history.lease_start,
            end_date: history.lease_end,
          });

          if (existingHistoryContract) {
            console.log(`   ⏭️  History contract already exists, skipping...`);
            historySkipped++;
            continue;
          }

          // Determine status from history
          let historyStatus = "ended";
          if (history.status === "terminated") {
            historyStatus = "terminated";
          }

          const historyContract = new Contract({
            tenant_id: tenant._id,
            listing_id: history.listing_id,
            owner_id: tenant.owner_id,
            signed_date: history.lease_start || new Date(),
            start_date: history.lease_start,
            end_date: history.lease_end,
            weekly_rent: history.weekly_rent,
            bond_amount: history.bond_paid || 0,
            bond_paid: history.bond_paid > 0,
            payment_frequency: "weekly",
            status: historyStatus,
            termination_reason: history.end_reason || "",
            termination_date: history.ended_at || history.lease_end,
            terms: {},
            documents: [],
          });

          await historyContract.save();
          console.log(`   ✅ Created history contract from ${history.lease_start?.toLocaleDateString()} to ${history.lease_end?.toLocaleDateString()}`);
          historyCreated++;
        } catch (error) {
          console.error(`   ❌ Error creating history contract:`, error.message);
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 History Migration Summary:");
    console.log("=".repeat(50));
    console.log(`✅ History contracts created: ${historyCreated}`);
    console.log(`⏭️  Skipped (already exist): ${historySkipped}`);
    console.log("=".repeat(50) + "\n");

    console.log("✅ Migration completed successfully!\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration
migrateTenantsToContracts();
