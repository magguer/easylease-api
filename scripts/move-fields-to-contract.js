import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function moveFieldsToContract() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const listingsCollection = db.collection('listings');
    const contractsCollection = db.collection('contracts');

    // 1. Verificar cuántos listings tienen los campos que vamos a mover
    const listingsWithFields = await listingsCollection.countDocuments({
      $or: [
        { bills_included: { $exists: true } },
        { status: { $exists: true } },
        { tenant_id: { $exists: true } }
      ]
    });

    console.log(`\n📊 Listings con campos a mover: ${listingsWithFields}`);

    if (listingsWithFields === 0) {
      console.log('✅ No hay campos para mover');
      await mongoose.connection.close();
      return;
    }

    // 2. Mostrar algunos ejemplos antes de mover
    const examples = await listingsCollection.find({
      $or: [
        { bills_included: { $exists: true } },
        { status: { $exists: true } },
        { tenant_id: { $exists: true } }
      ]
    }).limit(3).toArray();

    console.log('\n📝 Ejemplos de datos a procesar:');
    examples.forEach((listing, index) => {
      console.log(`\nListing ${index + 1}: ${listing.title || listing._id}`);
      if (listing.bills_included !== undefined) console.log(`  - bills_included: ${listing.bills_included}`);
      if (listing.status) console.log(`  - status: ${listing.status}`);
      if (listing.tenant_id) console.log(`  - tenant_id: ${listing.tenant_id}`);
    });

    // 3. Para cada listing con tenant_id, buscar contratos activos y actualizar
    console.log('\n🔧 Buscando contratos activos para actualizar...');
    
    const listingsWithTenant = await listingsCollection.find({
      tenant_id: { $exists: true, $ne: null }
    }).toArray();

    let contractsUpdated = 0;
    let contractsNotFound = 0;

    for (const listing of listingsWithTenant) {
      // Buscar contrato activo para este listing
      const contract = await contractsCollection.findOne({
        listing_id: listing._id,
        status: { $in: ['active', 'ending_soon', 'draft'] }
      });

      if (contract) {
        // Actualizar contrato con bills_included si existe en el listing
        const updateData = {};
        if (listing.bills_included !== undefined) {
          updateData.bills_included = listing.bills_included;
        }

        if (Object.keys(updateData).length > 0) {
          await contractsCollection.updateOne(
            { _id: contract._id },
            { $set: updateData }
          );
          contractsUpdated++;
          console.log(`  ✅ Contrato ${contract._id} actualizado para listing "${listing.title}"`);
        }
      } else {
        contractsNotFound++;
        console.log(`  ⚠️  No se encontró contrato activo para listing "${listing.title}" (${listing._id})`);
      }
    }

    console.log(`\n📊 Contratos actualizados: ${contractsUpdated}`);
    console.log(`📊 Listings sin contrato activo: ${contractsNotFound}`);

    // 4. Eliminar los campos obsoletos de listings
    console.log('\n🔧 Eliminando campos obsoletos de listings...');
    const result = await listingsCollection.updateMany(
      {},
      {
        $unset: {
          bills_included: '',
          status: '',
          tenant_id: ''
        }
      }
    );

    console.log(`\n✅ Operación completada:`);
    console.log(`   - Documentos de listings encontrados: ${result.matchedCount}`);
    console.log(`   - Documentos de listings modificados: ${result.modifiedCount}`);
    console.log(`   - Contratos actualizados con bills_included: ${contractsUpdated}`);

    // 5. Verificar que se eliminaron
    const remaining = await listingsCollection.countDocuments({
      $or: [
        { bills_included: { $exists: true } },
        { status: { $exists: true } },
        { tenant_id: { $exists: true } }
      ]
    });

    console.log(`   - Campos obsoletos restantes en listings: ${remaining}`);

    if (remaining === 0) {
      console.log('\n✅ Todos los campos obsoletos fueron movidos/eliminados exitosamente');
    } else {
      console.log('\n⚠️  Algunos campos obsoletos aún existen');
    }

    await mongoose.connection.close();
    console.log('\n✅ Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

moveFieldsToContract();
