import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function removeOldListingFields() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const listingsCollection = db.collection('listings');

    // Verificar cuántos listings tienen los campos antiguos
    const listingsWithOldFields = await listingsCollection.countDocuments({
      $or: [
        { price_per_week: { $exists: true } },
        { bond: { $exists: true } },
        { available_from: { $exists: true } },
        { min_term_weeks: { $exists: true } }
      ]
    });

    console.log(`\n📊 Listings con campos obsoletos: ${listingsWithOldFields}`);

    if (listingsWithOldFields === 0) {
      console.log('✅ No hay campos obsoletos para eliminar');
      await mongoose.connection.close();
      return;
    }

    // Mostrar algunos ejemplos antes de eliminar
    const examples = await listingsCollection.find({
      $or: [
        { price_per_week: { $exists: true } },
        { bond: { $exists: true } },
        { available_from: { $exists: true } },
        { min_term_weeks: { $exists: true } }
      ]
    }).limit(3).toArray();

    console.log('\n📝 Ejemplos de datos a eliminar:');
    examples.forEach((listing, index) => {
      console.log(`\nListing ${index + 1}: ${listing.title || listing._id}`);
      if (listing.price_per_week) console.log(`  - price_per_week: ${listing.price_per_week}`);
      if (listing.bond) console.log(`  - bond: ${listing.bond}`);
      if (listing.available_from) console.log(`  - available_from: ${listing.available_from}`);
      if (listing.min_term_weeks) console.log(`  - min_term_weeks: ${listing.min_term_weeks}`);
    });

    // Eliminar los campos obsoletos
    console.log('\n🔧 Eliminando campos obsoletos...');
    const result = await listingsCollection.updateMany(
      {},
      {
        $unset: {
          price_per_week: '',
          bond: '',
          available_from: '',
          min_term_weeks: ''
        }
      }
    );

    console.log(`\n✅ Operación completada:`);
    console.log(`   - Documentos encontrados: ${result.matchedCount}`);
    console.log(`   - Documentos modificados: ${result.modifiedCount}`);

    // Verificar que se eliminaron
    const remaining = await listingsCollection.countDocuments({
      $or: [
        { price_per_week: { $exists: true } },
        { bond: { $exists: true } },
        { available_from: { $exists: true } },
        { min_term_weeks: { $exists: true } }
      ]
    });

    console.log(`   - Campos obsoletos restantes: ${remaining}`);

    if (remaining === 0) {
      console.log('\n✅ Todos los campos obsoletos fueron eliminados exitosamente');
    } else {
      console.log('\n⚠️ Algunos campos obsoletos aún existen');
    }

    await mongoose.connection.close();
    console.log('\n✅ Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

removeOldListingFields();
