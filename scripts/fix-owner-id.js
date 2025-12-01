import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easylease';

async function fixOwnerIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with partner_id field
    const usersWithPartnerId = await User.find({ partner_id: { $exists: true } });
    
    console.log(`📊 Found ${usersWithPartnerId.length} users with partner_id field\n`);

    if (usersWithPartnerId.length === 0) {
      console.log('✅ No users need migration\n');
    } else {
      for (const user of usersWithPartnerId) {
        console.log(`🔄 Migrating user: ${user.email}`);
        console.log(`   - Current partner_id: ${user.partner_id}`);
        
        // Set owner_id to partner_id value
        user.owner_id = user.partner_id;
        // Remove partner_id
        user.partner_id = undefined;
        
        await user.save();
        console.log(`   ✅ Migrated to owner_id: ${user.owner_id}\n`);
      }
      
      console.log(`✅ Successfully migrated ${usersWithPartnerId.length} users\n`);
    }

    // Show all owner users
    const ownerUsers = await User.find({ role: 'owner' }).select('email name role owner_id partner_id');
    console.log('📋 All owner users:');
    ownerUsers.forEach(user => {
      console.log(`   - ${user.email}: owner_id=${user.owner_id || 'NOT SET'}, partner_id=${user.partner_id || 'none'}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Migration completed and disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixOwnerIds();
