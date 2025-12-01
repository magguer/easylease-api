import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function cleanObsoleteFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const tenantsCollection = db.collection('tenants');

    // Campos a eliminar
    const obsoleteFields = [
      'listing_id',
      'lease_start',
      'lease_end',
      'weekly_rent',
      'bond_paid',
      'payment_method',
      'move_in_inspection',
      'lease_history',
      'bond_amount',
      'bills_included',
      'payment_frequency',
    ];

    console.log('🧹 Eliminando campos obsoletos de tenants...\n');

    // Contar cuántos tenants tienen cada campo antes de eliminar
    for (const field of obsoleteFields) {
      const count = await tenantsCollection.countDocuments({ [field]: { $exists: true } });
      if (count > 0) {
        console.log(`📋 ${field}: ${count} tenants`);
      }
    }

    // Crear objeto de actualización para eliminar todos los campos
    const unsetFields = {};
    obsoleteFields.forEach(field => {
      unsetFields[field] = '';
    });

    // Ejecutar actualización
    const result = await tenantsCollection.updateMany(
      {},
      { $unset: unsetFields }
    );

    console.log(`\n✅ Actualización completada:`);
    console.log(`   - Documentos coincidentes: ${result.matchedCount}`);
    console.log(`   - Documentos modificados: ${result.modifiedCount}`);

    // Verificar que se eliminaron
    console.log('\n🔍 Verificando eliminación:\n');
    for (const field of obsoleteFields) {
      const count = await tenantsCollection.countDocuments({ [field]: { $exists: true } });
      if (count > 0) {
        console.log(`❌ ${field}: AÚN quedan ${count} tenants con este campo`);
      } else {
        console.log(`✅ ${field}: eliminado correctamente`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Limpieza completada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanObsoleteFields();
