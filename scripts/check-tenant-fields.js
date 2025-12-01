import * as dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Tenant from "../src/models/Tenant.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function checkTenants() {
  try {
    await mongoose.connect(MONGODB_URI);
    const tenants = await Tenant.find({});
    
    console.log("Tenants found:", tenants.length);
    tenants.forEach(t => {
      console.log("\nTenant:", t.name);
      console.log("Fields:", {
        lease_start: t.lease_start,
        lease_end: t.lease_end,
        weekly_rent: t.weekly_rent,
        bond_paid: t.bond_paid,
        listing_id: t.listing_id,
        owner_id: t.owner_id,
      });
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkTenants();
