import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function fixOwnerPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all owner users
    const ownerUsers = await User.find({ role: 'owner' }).select('+password');
    console.log(`\n📋 Found ${ownerUsers.length} owner users:\n`);
    
    ownerUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
    });

    if (ownerUsers.length === 0) {
      console.log('No owner users found.');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    console.log('\n⚠️  This script will reset passwords for owner accounts.');
    console.log('You can either:');
    console.log('1. Set the same password for all owners');
    console.log('2. Set individual passwords for each owner');
    
    const choice = await question('\nEnter your choice (1 or 2): ');

    if (choice === '1') {
      const newPassword = await question('Enter new password for all owners: ');
      
      // Temporarily disable the pre-save hook by using updateOne
      for (const user of ownerUsers) {
        // Hash the password manually (only once)
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update directly without triggering pre-save hook
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        console.log(`✅ Updated password for ${user.email}`);
      }
      
      console.log(`\n✅ All passwords updated to: ${newPassword}`);
      console.log('Share these credentials with the owners.');
      
    } else if (choice === '2') {
      for (const user of ownerUsers) {
        const newPassword = await question(`\nEnter new password for ${user.name} (${user.email}): `);
        
        // Hash the password manually (only once)
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update directly without triggering pre-save hook
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        console.log(`✅ Updated password for ${user.email}`);
      }
      
      console.log('\n✅ All passwords updated successfully.');
      
    } else {
      console.log('Invalid choice. Exiting.');
    }

    rl.close();
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixOwnerPasswords();
