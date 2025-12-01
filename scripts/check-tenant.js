import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';
import Listing from '../src/models/Listing.js';
import dotenv from 'dotenv';

dotenv.config();

const checkTenant = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const tenant = await Tenant.findOne({ email: 'martintelaguer@gmail.com' })
      .populate('listing_id')
      .populate('owner_id');
    
    if (!tenant) {
      console.log('Tenant not found');
      return;
    }

    console.log('\n=== Tenant Info ===');
    console.log('Name:', tenant.name);
    console.log('Email:', tenant.email);
    console.log('Status:', tenant.status);
    console.log('Listing ID:', tenant.listing_id);
    console.log('Owner ID:', tenant.owner_id);
    console.log('Lease History:', tenant.lease_history?.length || 0, 'entries');

    if (tenant.listing_id) {
      console.log('\n=== Current Listing ===');
      console.log('Title:', tenant.listing_id.title);
      console.log('Status:', tenant.listing_id.status);
      console.log('Tenant ID in listing:', tenant.listing_id.tenant_id);
    } else {
      console.log('\n=== No current listing ===');
      
      // Check available listings
      const availableListings = await Listing.find({ 
        owner_id: tenant.owner_id,
        status: 'published' 
      });
      console.log('\nAvailable listings for this owner:', availableListings.length);
      availableListings.forEach(listing => {
        console.log(`- ${listing.title} (${listing._id})`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkTenant();
