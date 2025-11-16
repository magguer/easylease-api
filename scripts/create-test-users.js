import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

// Import models
import User from "../src/models/User.js";
import Partner from "../src/models/Partner.js";
import Tenant from "../src/models/Tenant.js";
import Listing from "../src/models/Listing.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function createTestUsers() {
  try {
    // Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // ============================================
    // 1. CREATE MANAGER USER
    // ============================================
    console.log("\n📋 Creating MANAGER user...");
    
    let manager = await User.findOne({ email: "manager@easylease.com" });
    
    if (manager) {
      console.log("⚠️  Manager user already exists");
    } else {
      manager = new User({
        email: "manager@easylease.com",
        password: "manager123",
        name: "Property Manager",
        role: "manager",
        phone: "+61 400 000 001",
        isActive: true,
      });
      await manager.save();
      console.log("✅ Manager user created!");
    }

    console.log({
      id: manager._id,
      email: manager.email,
      name: manager.name,
      role: manager.role,
    });

    // ============================================
    // 2. CREATE OWNER USER (with Partner profile)
    // ============================================
    console.log("\n📋 Creating OWNER user...");
    
    let owner = await User.findOne({ email: "owner@easylease.com" });
    let partner;

    if (owner) {
      console.log("⚠️  Owner user already exists");
      partner = await Partner.findById(owner.partner_id);
    } else {
      // First create the Partner profile
      partner = new Partner({
        name: "John Property Owner",
        email: "owner@easylease.com",
        phone: "+61 400 000 002",
        isActive: true,
        documents: [],
      });
      await partner.save();
      console.log("✅ Partner profile created!");

      // Then create the User linked to Partner
      owner = new User({
        email: "owner@easylease.com",
        password: "owner123",
        name: "John Property Owner",
        role: "owner",
        phone: "+61 400 000 002",
        partner_id: partner._id,
        isActive: true,
      });
      await owner.save();
      console.log("✅ Owner user created!");
    }

    console.log({
      userId: owner._id,
      email: owner.email,
      name: owner.name,
      role: owner.role,
      partnerId: partner._id,
    });

    // ============================================
    // 3. CREATE TENANT USER (with Tenant profile)
    // ============================================
    console.log("\n📋 Creating TENANT user...");
    
    let tenantUser = await User.findOne({ email: "tenant@easylease.com" });
    let tenantProfile;

    if (tenantUser) {
      console.log("⚠️  Tenant user already exists");
      tenantProfile = await Tenant.findById(tenantUser.tenant_id);
    } else {
      // First, we need a listing for the tenant
      let listing = await Listing.findOne();
      
      if (!listing) {
        // Create a sample listing
        listing = new Listing({
          title: "Cozy Room in Sydney CBD",
          slug: "cozy-room-sydney-cbd",
          price_per_week: 250,
          bond: 1000,
          bills_included: true,
          address: "123 George Street, Sydney NSW 2000",
          suburb: "Sydney",
          room_type: "single",
          available_from: new Date(),
          min_term_weeks: 12,
          status: "rented",
          owner_partner_id: partner._id,
          locale: "en",
        });
        await listing.save();
        console.log("✅ Sample listing created!");
      }

      // Create Tenant profile
      const leaseStart = new Date();
      const leaseEnd = new Date();
      leaseEnd.setMonth(leaseEnd.getMonth() + 6); // 6 months lease

      tenantProfile = new Tenant({
        name: "Sarah Tenant",
        email: "tenant@easylease.com",
        phone: "+61 400 000 003",
        listing_id: listing._id,
        lease_start: leaseStart,
        lease_end: leaseEnd,
        weekly_rent: 250,
        bond_paid: 1000,
        payment_method: "bank_transfer",
        status: "active",
        emergency_contact: {
          name: "Emergency Contact",
          phone: "+61 400 000 004",
          relationship: "Parent",
        },
      });
      await tenantProfile.save();
      console.log("✅ Tenant profile created!");

      // Create User linked to Tenant
      tenantUser = new User({
        email: "tenant@easylease.com",
        password: "tenant123",
        name: "Sarah Tenant",
        role: "tenant",
        phone: "+61 400 000 003",
        tenant_id: tenantProfile._id,
        isActive: true,
      });
      await tenantUser.save();
      console.log("✅ Tenant user created!");
    }

    console.log({
      userId: tenantUser._id,
      email: tenantUser.email,
      name: tenantUser.name,
      role: tenantUser.role,
      tenantId: tenantProfile?._id,
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n\n✅ ========================================");
    console.log("✅ ALL TEST USERS CREATED SUCCESSFULLY!");
    console.log("✅ ========================================\n");

    console.log("🔐 LOGIN CREDENTIALS:\n");

    console.log("👨‍💼 MANAGER (Full Access):");
    console.log("   Email: manager@easylease.com");
    console.log("   Password: manager123");
    console.log("   Role: manager");
    console.log("   Access: All properties, tenants, owners, reports\n");

    console.log("🏠 OWNER (Property Owner):");
    console.log("   Email: owner@easylease.com");
    console.log("   Password: owner123");
    console.log("   Role: owner");
    console.log("   Access: Their properties, their tenants, financial reports\n");

    console.log("👤 TENANT (Current Tenant):");
    console.log("   Email: tenant@easylease.com");
    console.log("   Password: tenant123");
    console.log("   Role: tenant");
    console.log("   Access: Their rental details, payments, maintenance requests\n");

    console.log("⚠️  IMPORTANT: Change all passwords in production!\n");

    // Close connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error creating test users:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
createTestUsers();
