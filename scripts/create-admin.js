ximport mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

// Import User model
import User from "../src/models/User.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/easylease";

async function createAdmin() {
  try {
    // Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Admin data
    const adminData = {
      email: "admin@easylease.com",
      password: "admin123456",
      name: "Administrator",
      role: "admin",
      isActive: true,
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists:");
      console.log({
        id: existingAdmin._id,
        email: existingAdmin.email,
        name: existingAdmin.name,
        role: existingAdmin.role,
      });
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const admin = new User(adminData);
    await admin.save();

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", adminData.email);
    console.log("🔑 Password:", adminData.password);
    console.log("👤 Name:", adminData.name);
    console.log("🎭 Role:", adminData.role);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");

    // Close connection
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
createAdmin();
