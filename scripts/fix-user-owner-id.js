import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get owner
    const owner = await db.collection('owners').findOne({ 
      email: 'leonardomontoya@easylease.com' 
    });

    if (!owner) {
      console.log('❌ Owner not found');
      return;
    }

    console.log('✅ Owner found:', owner._id.toString());

    // Update user with owner_id
    const result = await db.collection('users').updateOne(
      { email: 'leonardomontoya@easylease.com' },
      { $set: { owner_id: owner._id.toString() } }
    );

    console.log('✅ User updated:', result.modifiedCount, 'document(s) modified');

    // Verify
    const user = await db.collection('users').findOne({ 
      email: 'leonardomontoya@easylease.com' 
    });

    console.log('\n📋 Updated user:');
    console.log('   - Email:', user.email);
    console.log('   - Role:', user.role);
    console.log('   - Owner ID:', user.owner_id);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
