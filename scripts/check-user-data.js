import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Owner from '../src/models/Owner.js';
import Listing from '../src/models/Listing.js';
import Lead from '../src/models/Lead.js';
import Tenant from '../src/models/Tenant.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easylease';

async function checkUserData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find().select('email name role owner_id tenant_id');
    
    console.log('👥 ALL USERS:');
    console.log('=' .repeat(80));
    for (const user of users) {
      console.log(`\n📧 ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      
      if (user.role === 'owner') {
        if (user.owner_id) {
          const owner = await Owner.findById(user.owner_id);
          if (owner) {
            console.log(`   ✅ Owner ID: ${user.owner_id} (${owner.name})`);
            
            // Count listings for this owner
            const listingsCount = await Listing.countDocuments({ owner_id: user.owner_id });
            console.log(`   📋 Listings: ${listingsCount}`);
            
            // Count leads for this owner's listings
            const ownerListings = await Listing.find({ owner_id: user.owner_id }).select('_id');
            const listingIds = ownerListings.map(l => l._id);
            const leadsCount = await Lead.countDocuments({ listing_id: { $in: listingIds } });
            console.log(`   📝 Leads: ${leadsCount}`);
            
            // Count tenants for this owner's properties
            const tenantsCount = await Tenant.countDocuments({ listing_id: { $in: listingIds } });
            console.log(`   👤 Tenants: ${tenantsCount}`);
          } else {
            console.log(`   ❌ Owner ID: ${user.owner_id} (NOT FOUND IN DATABASE)`);
          }
        } else {
          console.log(`   ⚠️  NO OWNER_ID SET - This owner won't see any data!`);
        }
      } else if (user.role === 'tenant') {
        if (user.tenant_id) {
          const tenant = await Tenant.findById(user.tenant_id).populate('listing_id');
          if (tenant) {
            console.log(`   ✅ Tenant ID: ${user.tenant_id}`);
            console.log(`   🏠 Listing: ${tenant.listing_id?.title || 'N/A'}`);
          } else {
            console.log(`   ❌ Tenant ID: ${user.tenant_id} (NOT FOUND IN DATABASE)`);
          }
        } else {
          console.log(`   ⚠️  NO TENANT_ID SET`);
        }
      } else if (user.role === 'manager') {
        // Count all data for managers
        const allListings = await Listing.countDocuments();
        const allLeads = await Lead.countDocuments();
        const allTenants = await Tenant.countDocuments();
        console.log(`   📊 Can see ALL data:`);
        console.log(`      - Listings: ${allListings}`);
        console.log(`      - Leads: ${allLeads}`);
        console.log(`      - Tenants: ${allTenants}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:');
    const managerCount = await User.countDocuments({ role: 'manager' });
    const ownerCount = await User.countDocuments({ role: 'owner' });
    const tenantCount = await User.countDocuments({ role: 'tenant' });
    const ownersWithoutId = await User.countDocuments({ role: 'owner', owner_id: { $exists: false } });
    const tenantsWithoutId = await User.countDocuments({ role: 'tenant', tenant_id: { $exists: false } });
    
    console.log(`   Managers: ${managerCount}`);
    console.log(`   Owners: ${ownerCount} (${ownersWithoutId} without owner_id ⚠️)`);
    console.log(`   Tenants: ${tenantCount} (${tenantsWithoutId} without tenant_id ⚠️)`);

    await mongoose.disconnect();
    console.log('\n✅ Check completed and disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserData();
