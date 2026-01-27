/**
 * Script: Inserisce i dati ufficiali di produzione
 * Esegui: node backend/scripts/seed_official_data.js
 */

const db = require('../services/database');

async function seedOfficialData() {
  console.log('🚀 Inizializzazione dati ufficiali ViCanto...\n');

  try {
    // =========================
    // PULIZIA TABELLE
    // =========================
    console.log('🗑️  Pulizia tabelle esistenti...');
    await db('products').del();
    await db('flavors').del();
    await db('supplements').del();
    await db('menu_categories').del();


    // =========================
    // CATEGORIE
    // =========================
    console.log('📁 Inserimento categorie...');
    await db('menu_categories').insert([
      { code: 'CAT_CONI', name: 'Coni', icon: null, base_price: 0, display_order: 1, is_active: true },
      { code: 'CAT_BEVANDE', name: 'Bevande', icon: null, base_price: 0, display_order: 2, is_active: true },
      { code: 'CAT_COPPETTE', name: 'Coppette', icon: null, base_price: 0, display_order: 3, is_active: true },
      { code: 'CAT_CREPES', name: 'Crepes', icon: null, base_price: 0, display_order: 4, is_active: true },
      { code: 'CAT_PANCAKE', name: 'Pancake', icon: null, base_price: 0, display_order: 5, is_active: true },
      { code: 'CAT_WAFFLES', name: 'Waffles', icon: null, base_price: 0, display_order: 6, is_active: true },
      { code: 'CAT_ALTRO', name: 'Altro', icon: null, base_price: 0, display_order: 7, is_active: true }
    ]);


    // =========================
    // PRODOTTI - CONI
    // =========================
    console.log('🍦 Inserimento prodotti CONI...');
    await db('products').insert([
      { code: 'CONO_STD', name: 'Cono', category_code: 'CAT_CONI', price: 3.00, has_flavors: true, display_order: 1, is_available: true },
      { code: 'CONO_PICCOLO', name: 'Cono piccolo', category_code: 'CAT_CONI', price: 2.50, has_flavors: true, display_order: 2, is_available: true },
      { code: 'CONO_CIALDA_GRANDE', name: 'Cono cialda grande', category_code: 'CAT_CONI', price: 4.00, has_flavors: true, display_order: 3, is_available: true },
      { code: 'CONO_CIALDA_PICCOLO', name: 'Cono cialda piccolo', category_code: 'CAT_CONI', price: 3.00, has_flavors: true, display_order: 4, is_available: true }
    ]);


    // =========================
    // PRODOTTI - BEVANDE
    // =========================
    console.log('☕ Inserimento prodotti BEVANDE...');
    await db('products').insert([
      { code: 'CAFFE', name: 'Caffe', category_code: 'CAT_BEVANDE', price: 1.00, has_flavors: false, display_order: 1, is_available: true },
      { code: 'CAFFE_PANNA', name: 'Caffe con panna', category_code: 'CAT_BEVANDE', price: 1.50, has_flavors: false, display_order: 2, is_available: true },
      { code: 'CAFFE_MACCHIATO', name: 'Caffe macchiato', category_code: 'CAT_BEVANDE', price: 1.50, has_flavors: false, display_order: 3, is_available: true },
      { code: 'CAPPUCCINO', name: 'Cappuccino', category_code: 'CAT_BEVANDE', price: 1.50, has_flavors: false, display_order: 4, is_available: true },
      { code: 'CREMINO_CAFFE', name: 'Cremino caffe', category_code: 'CAT_BEVANDE', price: 3.00, has_flavors: false, display_order: 5, is_available: true },
      { code: 'CAFFE_DECA', name: 'Caffe decaffeinato', category_code: 'CAT_BEVANDE', price: null, has_flavors: false, display_order: 6, is_available: true },
      { code: 'ACQUA_PICCOLA', name: 'Acqua piccola', category_code: 'CAT_BEVANDE', price: 1.00, has_flavors: false, display_order: 7, is_available: true },
      { code: 'ACQUA_GRANDE', name: 'Acqua grande', category_code: 'CAT_BEVANDE', price: 2.00, has_flavors: false, display_order: 8, is_available: true },
      { code: 'COCA_COLA', name: 'Coca Cola', category_code: 'CAT_BEVANDE', price: 2.50, has_flavors: false, display_order: 9, is_available: true },
      { code: 'ESTATHE', name: 'Estathe', category_code: 'CAT_BEVANDE', price: 2.50, has_flavors: false, display_order: 10, is_available: true },
      { code: 'THE_GRANITA', name: 'The e granita', category_code: 'CAT_BEVANDE', price: 4.00, has_flavors: false, display_order: 11, is_available: true },
      { code: 'ACQUA_TONICA', name: 'Acqua tonica', category_code: 'CAT_BEVANDE', price: 2.50, has_flavors: false, display_order: 12, is_available: true },
      { code: 'BECKS', name: 'Becks', category_code: 'CAT_BEVANDE', price: 2.50, has_flavors: false, display_order: 13, is_available: true },
      { code: 'PATATINE', name: 'Patatine', category_code: 'CAT_BEVANDE', price: 1.00, has_flavors: false, display_order: 14, is_available: true }
    ]);


    // =========================
    // PRODOTTI - COPPETTE
    // =========================
    console.log('🥣 Inserimento prodotti COPPETTE...');
    await db('products').insert([
      { code: 'COPPETTA_PICCOLA', name: 'Coppetta piccola', category_code: 'CAT_COPPETTE', price: 2.50, has_flavors: true, display_order: 1, is_available: true },
      { code: 'COPPETTA_MEDIA', name: 'Coppetta media', category_code: 'CAT_COPPETTE', price: 3.00, has_flavors: true, display_order: 2, is_available: true },
      { code: 'COPPETTA_GRANDE', name: 'Coppetta grande', category_code: 'CAT_COPPETTE', price: 3.50, has_flavors: true, display_order: 3, is_available: true }
    ]);


    // =========================
    // PRODOTTI - CREPES
    // =========================
    console.log('🥞 Inserimento prodotti CREPES...');
    await db('products').insert([
      { code: 'CREPES_GELATO', name: 'Crepes gelato', category_code: 'CAT_CREPES', price: 5.50, has_flavors: true, display_order: 1, is_available: true },
      { code: 'CREPES_NUTELLA', name: 'Crepes Nutella', category_code: 'CAT_CREPES', price: 3.50, has_flavors: false, display_order: 2, is_available: true },
      { code: 'CREPES_PISTACCHIO', name: 'Crepes Nutella di pistacchio', category_code: 'CAT_CREPES', price: 4.00, has_flavors: false, display_order: 3, is_available: true },
      { code: 'CREPES_BIANCA', name: 'Crepes Nutella bianca', category_code: 'CAT_CREPES', price: 3.50, has_flavors: false, display_order: 4, is_available: true },
      { code: 'CREPES_BASE', name: 'Crepes', category_code: 'CAT_CREPES', price: null, has_flavors: false, display_order: 5, is_available: true }
    ]);


    // =========================
    // PRODOTTI - PANCAKE
    // =========================
    console.log('🥞 Inserimento prodotti PANCAKE...');
    await db('products').insert([
      { code: 'PANCAKE_GELATO', name: 'Pancake gelato', category_code: 'CAT_PANCAKE', price: 5.50, has_flavors: true, display_order: 1, is_available: true },
      { code: 'PANCAKE_NUTELLA', name: 'Pancake Nutella', category_code: 'CAT_PANCAKE', price: 3.50, has_flavors: false, display_order: 2, is_available: true },
      { code: 'PANCAKE_PISTACCHIO', name: 'Pancake Nutella di pistacchio', category_code: 'CAT_PANCAKE', price: 4.00, has_flavors: false, display_order: 3, is_available: true },
      { code: 'PANCAKE_BIANCA', name: 'Pancake Nutella bianca', category_code: 'CAT_PANCAKE', price: 3.50, has_flavors: false, display_order: 4, is_available: true },
      { code: 'PANCAKE_BASE', name: 'Pancake', category_code: 'CAT_PANCAKE', price: null, has_flavors: false, display_order: 5, is_available: true }
    ]);


    // =========================
    // PRODOTTI - WAFFLES
    // =========================
    console.log('🧇 Inserimento prodotti WAFFLES...');
    await db('products').insert([
      { code: 'WAFFLE_GELATO', name: 'Waffle gelato', category_code: 'CAT_WAFFLES', price: 5.50, has_flavors: true, display_order: 1, is_available: true },
      { code: 'WAFFLE_NUTELLA', name: 'Waffle Nutella', category_code: 'CAT_WAFFLES', price: 3.50, has_flavors: false, display_order: 2, is_available: true },
      { code: 'WAFFLE_PISTACCHIO', name: 'Waffle Nutella di pistacchio', category_code: 'CAT_WAFFLES', price: 4.00, has_flavors: false, display_order: 3, is_available: true },
      { code: 'WAFFLE_BIANCA', name: 'Waffle Nutella bianca', category_code: 'CAT_WAFFLES', price: 3.50, has_flavors: false, display_order: 4, is_available: true },
      { code: 'WAFFLE_BASE', name: 'Waffle', category_code: 'CAT_WAFFLES', price: null, has_flavors: false, display_order: 5, is_available: true }
    ]);


    // =========================
    // PRODOTTI - ALTRO
    // =========================
    console.log('🍨 Inserimento prodotti ALTRO...');
    await db('products').insert([
      { code: 'BRIOCHE', name: 'Brioche', category_code: 'CAT_ALTRO', price: 4.00, has_flavors: true, display_order: 1, is_available: true },
      { code: 'FRAPPE', name: 'Frappe', category_code: 'CAT_ALTRO', price: 3.00, has_flavors: true, display_order: 2, is_available: true },
      { code: 'FRAPPE_CROSTA', name: 'Frappe con crosta', category_code: 'CAT_ALTRO', price: 3.50, has_flavors: true, display_order: 3, is_available: true },
      { code: 'YOGURT', name: 'Yogurt', category_code: 'CAT_ALTRO', price: 3.50, has_flavors: false, display_order: 4, is_available: true },
      { code: 'YOGURT_FRUTTA', name: 'Yogurt con frutta', category_code: 'CAT_ALTRO', price: 4.50, has_flavors: false, display_order: 5, is_available: true },
      { code: 'CHURROS_5', name: 'Churros 5 pezzi', category_code: 'CAT_ALTRO', price: 4.50, has_flavors: false, display_order: 6, is_available: true },
      { code: 'BANANA_SPLIT', name: 'Banana split', category_code: 'CAT_ALTRO', price: 5.00, has_flavors: true, display_order: 7, is_available: true },
      { code: 'CANNOLO_SCOMP', name: 'Cannolo scomposto', category_code: 'CAT_ALTRO', price: 4.00, has_flavors: false, display_order: 8, is_available: true },
      { code: 'SPONGATO_VETRO', name: 'Spongato in vetro', category_code: 'CAT_ALTRO', price: 4.00, has_flavors: false, display_order: 9, is_available: true },
      { code: 'SPONGATO_FRUTTA', name: 'Spongato con frutta e gelato', category_code: 'CAT_ALTRO', price: 5.50, has_flavors: true, display_order: 10, is_available: true },
      { code: 'FRUTTA_STAGIONE', name: 'Frutta di stagione', category_code: 'CAT_ALTRO', price: 3.00, has_flavors: false, display_order: 11, is_available: true },
      { code: 'AFFOGATO', name: 'Affogato al caffe', category_code: 'CAT_ALTRO', price: 4.50, has_flavors: false, display_order: 12, is_available: true },
      { code: 'SPAGHETTI_ICE', name: 'Spaghetti ice', category_code: 'CAT_ALTRO', price: 5.00, has_flavors: true, display_order: 13, is_available: true },
      { code: 'TIRAMISU', name: 'Tiramisu', category_code: 'CAT_ALTRO', price: 4.50, has_flavors: false, display_order: 14, is_available: true },
      { code: 'POKE', name: 'Poke', category_code: 'CAT_ALTRO', price: 10.50, has_flavors: false, display_order: 15, is_available: true },
      { code: 'SGROPPINO', name: 'Sgroppino', category_code: 'CAT_ALTRO', price: 3.50, has_flavors: false, display_order: 16, is_available: true }
    ]);


    // =========================
    // GUSTI (per tutte le categorie)
    // =========================
    console.log('🍧 Inserimento gusti...');
    const gusti = ['Lotus', 'Zuppa inglese', 'Amarena', 'Pistacchio', 'Nocciola', 'Cookies', 'Fragola', 'Fior di latte', 'Cioccolato', 'Granita limone'];
    const categorieConGusti = ['CAT_CONI', 'CAT_COPPETTE', 'CAT_CREPES', 'CAT_PANCAKE', 'CAT_WAFFLES', 'CAT_ALTRO'];

    const flavorsData = [];
    for (const categoryCode of categorieConGusti) {
      gusti.forEach((gusto, index) => {
        flavorsData.push({
          name: gusto,
          category_code: categoryCode,
          display_order: index + 1,
          is_available: true
        });
      });
    }
    await db('flavors').insert(flavorsData);


    // =========================
    // SUPPLEMENTI
    // =========================
    console.log('➕ Inserimento supplementi...');
    await db('supplements').insert([
      { name: 'Topping fragola', code: 'topping_fragola', price: 0.50, display_order: 1, is_available: true },
      { name: 'Topping amarena', code: 'topping_amarena', price: 0.50, display_order: 2, is_available: true },
      { name: 'Topping caramello', code: 'topping_caramello', price: 0.50, display_order: 3, is_available: true },
      { name: 'Granella nocciola', code: 'granella_nocciola', price: 0.50, display_order: 4, is_available: true },
      { name: 'Palline cioccolato bianco', code: 'palline_cioccolato_bianco', price: 0.50, display_order: 5, is_available: true },
      { name: 'Palline cioccolato fondente', code: 'palline_cioccolato_fondente', price: 0.50, display_order: 6, is_available: true },
      { name: 'Panna', code: 'panna', price: 0.50, display_order: 7, is_available: true }
    ]);


    // =========================
    // VERIFICA
    // =========================
    console.log('\n📊 Riepilogo inserimenti:');
    const catCount = await db('menu_categories').count('* as count').first();
    const prodCount = await db('products').count('* as count').first();
    const flavorCount = await db('flavors').count('* as count').first();
    const suppCount = await db('supplements').count('* as count').first();

    console.log(`   ✅ Categorie:   ${catCount.count}`);
    console.log(`   ✅ Prodotti:    ${prodCount.count}`);
    console.log(`   ✅ Gusti:       ${flavorCount.count}`);
    console.log(`   ✅ Supplementi: ${suppCount.count}`);

    console.log('\n🎉 Dati ufficiali inseriti con successo!');

  } catch (error) {
    console.error('❌ Errore:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

seedOfficialData();
