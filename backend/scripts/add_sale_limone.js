/**
 * Script: Aggiunta supplemento Sale e limone per Corona
 * Esegui: node backend/scripts/add_sale_limone.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../services/database');

async function addSaleLimone() {
  try {
    console.log('🍋 Aggiunta supplemento Sale e limone...');

    const exists = await db('supplements').where('code', 'SUPP_SALE_LIMONE').first();
    if (!exists) {
      const maxOrder = await db('supplements').max('display_order as max').first();
      await db('supplements').insert({
        code: 'SUPP_SALE_LIMONE',
        name: 'Sale e limone',
        price: 0.50,
        display_order: (maxOrder?.max || 0) + 1,
        is_available: true
      });
      console.log('   ✅ Aggiunto: Sale e limone (€0.50)');
    } else {
      console.log('   ⏭️  Già presente: Sale e limone');
    }

    console.log('\n🎉 Fatto!');
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await db.destroy();
  }
}

addSaleLimone();
