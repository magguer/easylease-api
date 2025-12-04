import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://martintelaguer_db_user:dQ4JsPQoopNvDAMd@easyleasy-db.cjqr5bi.mongodb.net/easylease?retryWrites=true&w=majority';

async function analyzeDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const listings = await db.collection('listings').find({}).toArray();
    const contracts = await db.collection('contracts').find({}).toArray();

    console.log('=== ANÁLISIS BASE DE DATOS REMOTA ===\n');
    console.log('Total Listings:', listings.length);
    console.log('Total Contratos:', contracts.length);
    console.log('\n=== DETALLE POR LISTING ===\n');

    for (const listing of listings) {
      console.log('📍 LISTING:', listing.title);
      console.log('   ID:', listing._id);
      console.log('   Slug:', listing.slug);
      console.log('   Suburb:', listing.suburb || 'N/A');
      console.log('   Room Type:', listing.room_type || 'N/A');
      
      const listingContracts = contracts.filter(c => 
        c.listing_id && c.listing_id.toString() === listing._id.toString()
      );
      
      console.log('   Contratos asociados:', listingContracts.length);
      
      if (listingContracts.length > 0) {
        for (let i = 0; i < listingContracts.length; i++) {
          const c = listingContracts[i];
          console.log(`\n   📄 Contrato ${i + 1}:`);
          console.log('      Status:', c.status);
          console.log('      Tenant ID:', c.tenant_id || 'N/A');
          console.log('      Weekly Rent: $' + c.weekly_rent);
          console.log('      Bond: $' + (c.bond_amount || 'N/A'));
          console.log('      Payment Frequency:', c.payment_frequency || 'N/A');
          console.log('      Bills Included:', c.bills_included ? 'Sí' : 'No');
          console.log('      Start Date:', c.start_date || 'N/A');
          console.log('      End Date:', c.end_date || 'N/A');
        }
      }
      
      const availableContract = listingContracts.find(c => c.status === 'draft' && !c.tenant_id);
      const activeContract = listingContracts.find(c => c.status === 'active' || c.status === 'ending_soon');
      
      console.log('\n   ✅ Análisis:');
      console.log('      ¿Tiene contrato disponible (draft sin tenant)?', availableContract ? 'SÍ' : 'NO');
      console.log('      ¿Tiene contrato activo?', activeContract ? `SÍ (${activeContract.status})` : 'NO');
      console.log('      ¿DEBERÍA MOSTRARSE EN LA WEB?', (availableContract && !activeContract) ? '✅ SÍ' : '❌ NO');
      console.log('\n' + '='.repeat(70) + '\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeDB();
