/**
 * Migration Script: Rename Partner to Owner
 * 
 * This script:
 * 1. Renames the 'partners' collection to 'owners'
 * 2. Updates 'owner_partner_id' to 'owner_id' in listings
 * 3. Updates 'partner_id' to 'owner_id' in users
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easylease';

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Step 1: Rename partners collection to owners
    console.log('\n📦 Step 1: Renaming collection partners → owners');
    try {
      await db.collection('partners').rename('owners');
      console.log('✅ Collection renamed successfully');
    } catch (error) {
      if (error.codeName === 'NamespaceNotFound') {
        console.log('⚠️  Collection "partners" not found, skipping rename');
      } else if (error.codeName === 'NamespaceExists') {
        console.log('⚠️  Collection "owners" already exists, skipping rename');
      } else {
        throw error;
      }
    }

    // Step 2: Update owner_partner_id to owner_id in listings
    console.log('\n📝 Step 2: Updating listings collection');
    const listingsResult = await db.collection('listings').updateMany(
      { owner_partner_id: { $exists: true } },
      { $rename: { owner_partner_id: 'owner_id' } }
    );
    console.log(`✅ Updated ${listingsResult.modifiedCount} listings`);

    // Step 3: Update partner_id to owner_id in users
    console.log('\n👤 Step 3: Updating users collection');
    const usersResult = await db.collection('users').updateMany(
      { partner_id: { $exists: true } },
      { $rename: { partner_id: 'owner_id' } }
    );
    console.log(`✅ Updated ${usersResult.modifiedCount} users`);

    // Verification
    console.log('\n🔍 Verification:');
    const ownersCount = await db.collection('owners').countDocuments();
    const listingsWithOwnerId = await db.collection('listings').countDocuments({ owner_id: { $exists: true } });
    const usersWithOwnerId = await db.collection('users').countDocuments({ owner_id: { $exists: true } });
    
    console.log(`  - Owners collection: ${ownersCount} documents`);
    console.log(`  - Listings with owner_id: ${listingsWithOwnerId}`);
    console.log(`  - Users with owner_id: ${usersWithOwnerId}`);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
