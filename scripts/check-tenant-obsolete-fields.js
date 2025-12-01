import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkObsoleteFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const tenantsCollection = db.collection('tenants');

    // Obtener un tenant para ver todos los campos
    const sampleTenant = await tenantsCollection.findOne({});
    
    if (sampleTenant) {
      console.log('\n📋 Campos encontrados en un tenant de ejemplo:');
      console.log(Object.keys(sampleTenant));
      console.log('\n📄 Tenant completo:');
      console.log(JSON.stringify(sampleTenant, null, 2));
    }

    // Contar cuántos tenants tienen campos obsoletos
    const fieldsToCheck = [
      'listing_id',
      'lease_start_date',
      'lease_end_date',
      'weekly_rent',
      'bond_amount',
      'bond_paid',
      'bills_included',
      'payment_frequency',
    ];

    console.log('\n🔍 Verificando campos obsoletos:\n');
    
    for (const field of fieldsToCheck) {
      const count = await tenantsCollection.countDocuments({ [field]: { $exists: true } });
      if (count > 0) {
        console.log(`❌ ${field}: ${count} tenants tienen este campo`);
      } else {
        console.log(`✅ ${field}: ningún tenant tiene este campo`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Análisis completado');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkObsoleteFields();
