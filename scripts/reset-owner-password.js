import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_PASSWORD = 'Owner123!'; // Contraseña temporal

async function resetPassword() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    // Update user password
    const result = await db.collection('users').updateOne(
      { email: 'leonardomontoya@easylease.com' },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successfully!');
      console.log('\n📋 Login credentials:');
      console.log('   📧 Email: leonardomontoya@easylease.com');
      console.log('   🔑 Password:', NEW_PASSWORD);
      console.log('\n⚠️  Please change this password after logging in!');
    } else {
      console.log('❌ User not found or password not updated');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

resetPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
