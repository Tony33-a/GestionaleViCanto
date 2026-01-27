require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/services/database');

async function clearAllTables() {
  try {
    console.log('🧹 Pulizia tavoli e ordini...');
    
    // Libera tutti i tavoli
    await db('tables').update({ 
      status: 'free', 
      covers: 0, 
      total: 0.00,
      updated_at: new Date()
    });
    
    // Cancella tutti gli ordini non completati
    await db('orders').where('status', '!=', 'completed').update({ 
      status: 'cancelled',
      cancelled_at: new Date()
    });
    
    // Svuota la coda di stampa
    await db('print_queue').del();
    
    console.log('✅ Tutti i tavoli liberati e ordini cancellati');
    console.log('📊 Tavoli: tutti liberi');
    console.log('📋 Ordini: tutti cancellati (tranne completed)');
    console.log('🖨️ Print queue: svuotata');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }
}

clearAllTables();
