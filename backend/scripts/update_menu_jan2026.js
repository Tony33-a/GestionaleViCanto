/**
 * Script: Aggiornamento menu Gennaio 2026
 * - Rimozione prodotti obsoleti
 * - Aggiunta supplemento
 * - Aggiunta gusti granite e gelato
 * - Aggiunta bevande e birre
 * - Nuova categoria Patatine
 *
 * Esegui: node backend/scripts/update_menu_jan2026.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../services/database');

async function updateMenu() {
  try {
    console.log('🔄 Aggiornamento menu in corso...\n');

    // ========================================
    // 1. RIMOZIONE PRODOTTI OBSOLETI
    // ========================================
    console.log('🗑️  Rimozione prodotti obsoleti...');
    const productsToRemove = ['BANANA_SPLIT', 'CHURROS_5', 'CANNOLO_SCOMP'];
    for (const code of productsToRemove) {
      const deleted = await db('products').where('code', code).del();
      if (deleted) {
        console.log(`   ✅ Rimosso: ${code}`);
      } else {
        console.log(`   ⏭️  Non trovato: ${code}`);
      }
    }

    // ========================================
    // 2. AGGIUNTA SUPPLEMENTO
    // ========================================
    console.log('\n🍫 Aggiunta supplemento...');
    const supplementExists = await db('supplements').where('code', 'SUPP_TOPPING_CIOC_BIANCO').first();
    if (!supplementExists) {
      const maxOrder = await db('supplements').max('display_order as max').first();
      await db('supplements').insert({
        code: 'SUPP_TOPPING_CIOC_BIANCO',
        name: 'Topping cioccolato bianco',
        price: 0.50,
        display_order: (maxOrder?.max || 0) + 1,
        is_available: true
      });
      console.log('   ✅ Aggiunto: Topping cioccolato bianco');
    } else {
      console.log('   ⏭️  Già presente: Topping cioccolato bianco');
    }

    // ========================================
    // 3. AGGIUNTA GUSTI GELATO
    // ========================================
    console.log('\n🍦 Aggiunta gusti gelato...');

    // Gusti crema/speciali
    const gustiCrema = [
      'Dubai chocolate', 'Vaniglia', 'Cremino di pistacchio', 'Ciuri ciuri',
      'Nocciotella', 'Extra dark', 'Pistacchio vegano', 'Nocciola vegana',
      'Cookies', 'Nutella', 'Vi canto'
    ];

    // Gusti frutta
    const gustiFrutta = [
      'Cocco', 'Melone', 'Mango', 'Ananas', 'Mandarino',
      'Arancia sanguinella', 'Banana', 'Frutti di bosco', 'Granita gelsi'
    ];

    const allGustiGelato = [...gustiCrema, ...gustiFrutta];

    // Aggiungi gusti a Coni e Coppette
    const categorieConiCoppette = ['CAT_CONI', 'CAT_COPPETTE'];

    for (const catCode of categorieConiCoppette) {
      let order = await db('flavors').where('category_code', catCode).max('display_order as max').first();
      let currentOrder = order?.max || 0;

      for (const gustoName of allGustiGelato) {
        const exists = await db('flavors').where({ name: gustoName, category_code: catCode }).first();

        if (!exists) {
          currentOrder++;
          await db('flavors').insert({
            name: gustoName,
            category_code: catCode,
            display_order: currentOrder,
            is_available: true
          });
          console.log(`   ✅ Aggiunto in ${catCode}: ${gustoName}`);
        }
      }
    }

    // ========================================
    // 5. AGGIUNTA BEVANDE
    // ========================================
    console.log('\n🥤 Aggiunta bevande...');
    const bevandeToAdd = [
      { code: 'BEV_LEMON_SODA', name: 'Lemon Soda', price: 3.00 },
      { code: 'BEV_ENERGY_DRINK', name: 'Energy Drink', price: 4.00 },
      { code: 'BEV_CRODINO', name: 'Crodino', price: 3.00 },
      { code: 'BEV_SPRITE', name: 'Sprite', price: 3.00 },
      { code: 'BEV_FANTA', name: 'Fanta', price: 3.00 },
      { code: 'BEV_SAN_PELLEGRINO', name: 'San Pellegrino', price: 2.50 }
    ];

    let bevOrder = await db('products').where('category_code', 'CAT_BEVANDE').max('display_order as max').first();
    let currentBevOrder = bevOrder?.max || 0;

    for (const bev of bevandeToAdd) {
      const exists = await db('products').where('code', bev.code).first();
      if (!exists) {
        currentBevOrder++;
        await db('products').insert({
          code: bev.code,
          name: bev.name,
          category_code: 'CAT_BEVANDE',
          price: bev.price,
          has_flavors: false,
          display_order: currentBevOrder,
          is_available: true,
          is_generic: false
        });
        console.log(`   ✅ Aggiunto: ${bev.name} - €${bev.price.toFixed(2)}`);
      } else {
        console.log(`   ⏭️  Già presente: ${bev.name}`);
      }
    }

    // ========================================
    // 6. AGGIUNTA BIRRE
    // ========================================
    console.log('\n🍺 Aggiunta birre...');
    const birreToAdd = [
      { code: 'BEV_NASTRO_AZZURRO', name: 'Nastro Azzurro', price: 4.00 },
      { code: 'BEV_CERES', name: 'Ceres', price: 4.50 },
      { code: 'BEV_BIRRA_STRETTO', name: 'Birra dello Stretto', price: 4.00 },
      { code: 'BEV_MESSINA_CRISTALLI', name: 'Messina Cristalli di Sale', price: 4.50 },
      { code: 'BEV_CORONA', name: 'Corona', price: 5.00 }
    ];

    for (const birra of birreToAdd) {
      const exists = await db('products').where('code', birra.code).first();
      if (!exists) {
        currentBevOrder++;
        await db('products').insert({
          code: birra.code,
          name: birra.name,
          category_code: 'CAT_BEVANDE',
          price: birra.price,
          has_flavors: false,
          display_order: currentBevOrder,
          is_available: true,
          is_generic: false
        });
        console.log(`   ✅ Aggiunto: ${birra.name} - €${birra.price.toFixed(2)}`);
      } else {
        console.log(`   ⏭️  Già presente: ${birra.name}`);
      }
    }

    // ========================================
    // 7. NUOVA CATEGORIA PATATINE
    // ========================================
    console.log('\n🍟 Creazione categoria Patatine...');

    // Verifica/crea categoria
    const catPatatine = await db('menu_categories').where('code', 'CAT_PATATINE').first();
    if (!catPatatine) {
      const maxCatOrder = await db('menu_categories').max('display_order as max').first();
      await db('menu_categories').insert({
        code: 'CAT_PATATINE',
        name: 'Patatine',
        icon: null,
        base_price: 0,
        display_order: (maxCatOrder?.max || 0) + 1,
        is_active: true
      });
      console.log('   ✅ Categoria creata: Patatine');
    } else {
      console.log('   ⏭️  Categoria già presente: Patatine');
    }

    // Aggiungi prodotti patatine
    console.log('\n🍟 Aggiunta prodotti Patatine...');
    const patatineToAdd = [
      { code: 'PAT_CLASSICHE', name: 'Patatine classiche', price: 2.50 },
      { code: 'PAT_PAPRIKA', name: 'Patatine paprika', price: 2.50 },
      { code: 'PAT_KETCHUP', name: 'Patatine ketchup', price: 2.50 },
      { code: 'PAT_BBQ', name: 'Patatine BBQ', price: 2.50 },
      { code: 'PAT_ANELLI_PIZZA', name: 'Patatine anelli di pizza', price: 2.50 },
      { code: 'PAT_GRIGLIATE', name: 'Patatine grigliate', price: 2.50 }
    ];

    let patOrder = 0;
    for (const pat of patatineToAdd) {
      const exists = await db('products').where('code', pat.code).first();
      if (!exists) {
        patOrder++;
        await db('products').insert({
          code: pat.code,
          name: pat.name,
          category_code: 'CAT_PATATINE',
          price: pat.price,
          has_flavors: false,
          display_order: patOrder,
          is_available: true,
          is_generic: false
        });
        console.log(`   ✅ Aggiunto: ${pat.name} - €${pat.price.toFixed(2)}`);
      } else {
        console.log(`   ⏭️  Già presente: ${pat.name}`);
      }
    }

    // Aggiungi prodotto generico per Patatine
    const genericPat = await db('products').where('code', 'GENERICO_PATATINE').first();
    if (!genericPat) {
      patOrder++;
      await db('products').insert({
        code: 'GENERICO_PATATINE',
        name: 'Generico',
        category_code: 'CAT_PATATINE',
        price: null,
        has_flavors: false,
        display_order: patOrder,
        is_available: true,
        is_generic: true
      });
      console.log('   ✅ Aggiunto: Generico (Patatine)');
    }

    console.log('\n🎉 Aggiornamento completato con successo!');

  } catch (error) {
    console.error('\n❌ Errore durante l\'aggiornamento:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

updateMenu();
