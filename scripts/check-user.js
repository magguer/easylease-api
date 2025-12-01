import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check for user
    console.log('\n👤 Checking for user with email: leonardomontoya@easylease.com');
    const user = await db.collection('users').findOne({ 
      email: 'leonardomontoya@easylease.com' 
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log('   - ID:', user._id);
      console.log('   - Email:', user.email);
      console.log('   - Name:', user.name);
      console.log('   - Role:', user.role);
      console.log('   - Owner ID:', user.owner_id);
      console.log('   - Has password:', !!user.password);
      console.log('   - Password hash (first 20 chars):', user.password?.substring(0, 20));
    } else {
      console.log('❌ User NOT found');
    }

    // Check for owner
    console.log('\n🏢 Checking for owner with email: leonardomontoya@easylease.com');
    const owner = await db.collection('owners').findOne({ 
      email: 'leonardomontoya@easylease.com' 
    });
    
    if (owner) {
      console.log('✅ Owner found:');
      console.log('   - ID:', owner._id);
      console.log('   - Email:', owner.email);
      console.log('   - Name:', owner.name);
      console.log('   - Status:', owner.status);
    } else {
      console.log('❌ Owner NOT found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
