/**
 * Script: Aggiunta categoria Granite
 * Esegui: node backend/scripts/add_granite.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../services/database');

async function addGranite() {
  try {
    console.log('🧊 Creazione categoria Granite...');

    // Verifica/crea categoria
    const catGranite = await db('menu_categories').where('code', 'CAT_GRANITE').first();
    if (!catGranite) {
      const maxCatOrder = await db('menu_categories').max('display_order as max').first();
      await db('menu_categories').insert({
        code: 'CAT_GRANITE',
        name: 'Granite',
        icon: null,
        base_price: 0,
        display_order: (maxCatOrder?.max || 0) + 1,
        is_active: true
      });
      console.log('   ✅ Categoria creata: Granite');
    } else {
      console.log('   ⏭️  Categoria già presente: Granite');
    }

    // Aggiungi prodotti granite
    console.log('\n🧊 Aggiunta prodotti Granite...');
    const graniteToAdd = [
      { code: 'GRANITA_LIMONE', name: 'Granita al limone', price: 3.50 },
      { code: 'GRANITA_GELSI', name: 'Granita ai gelsi', price: 3.50 }
    ];

    let order = 0;
    for (const g of graniteToAdd) {
      const exists = await db('products').where('code', g.code).first();
      if (!exists) {
        order++;
        await db('products').insert({
          code: g.code,
          name: g.name,
          category_code: 'CAT_GRANITE',
          price: g.price,
          has_flavors: false,
          display_order: order,
          is_available: true,
          is_generic: false
        });
        console.log(`   ✅ Aggiunto: ${g.name} - €${g.price.toFixed(2)}`);
      } else {
        console.log(`   ⏭️  Già presente: ${g.name}`);
      }
    }

    // Aggiungi prodotto generico per Granite
    const genericGranita = await db('products').where('code', 'GENERICO_GRANITE').first();
    if (!genericGranita) {
      order++;
      await db('products').insert({
        code: 'GENERICO_GRANITE',
        name: 'Generico',
        category_code: 'CAT_GRANITE',
        price: null,
        has_flavors: false,
        display_order: order,
        is_available: true,
        is_generic: true
      });
      console.log('   ✅ Aggiunto: Generico (Granite)');
    }

    console.log('\n🎉 Granite aggiunte con successo!');
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await db.destroy();
  }
}

addGranite();
