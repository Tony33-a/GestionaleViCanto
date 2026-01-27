/**
 * Script: Aggiunge prodotti generici in ogni categoria
 * Esegui: node backend/scripts/add_generic_products.js
 */

const db = require('../services/database');

async function addGenericProducts() {
  try {
    // Aggiungi colonna is_generic se non esiste
    console.log('Aggiungendo colonna is_generic...');
    await db.raw('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_generic BOOLEAN DEFAULT FALSE;');

    console.log('Aggiungendo prodotti generici...\n');

    const categories = ['CAT_CONI', 'CAT_BEVANDE', 'CAT_COPPETTE', 'CAT_CREPES', 'CAT_PANCAKE', 'CAT_WAFFLES', 'CAT_ALTRO'];

    for (const catCode of categories) {
      const maxOrder = await db('products')
        .where('category_code', catCode)
        .max('display_order as max')
        .first();

      const nextOrder = (maxOrder?.max || 0) + 1;
      const code = 'GENERICO_' + catCode.replace('CAT_', '');

      // Controlla se esiste gia
      const exists = await db('products').where('code', code).first();
      if (!exists) {
        await db('products').insert({
          code: code,
          name: 'Generico',
          category_code: catCode,
          price: null,
          has_flavors: false,
          display_order: nextOrder,
          is_available: true,
          is_generic: true
        });
        console.log('  ✅ Generico aggiunto in ' + catCode);
      } else {
        console.log('  ⏭️  Generico gia presente in ' + catCode);
      }
    }

    console.log('\n🎉 Fatto!');
  } catch (error) {
    console.error('❌ Errore:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

addGenericProducts();
