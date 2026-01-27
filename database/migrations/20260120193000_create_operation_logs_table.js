/**
 * Migration: Create operation_logs table
 * Log persistente delle operazioni critiche
 */

exports.up = function(knex) {
  return knex.schema.createTable('operation_logs', (table) => {
    table.increments('id').primary();
    table.enum('operation', [
      'table_open',      // Apertura tavolo
      'order_send',      // Invio comanda
      'order_complete',  // Completamento ordine
      'order_cancel',    // Annullamento ordine
      'table_free',      // Liberazione tavolo
      'print_success',   // Stampa riuscita
      'print_failed',    // Errore stampa
      'login',           // Login utente
      'logout'           // Logout utente
    ]).notNullable();
    table.integer('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.integer('table_id')
      .nullable()
      .references('id')
      .inTable('tables')
      .onDelete('SET NULL');
    table.integer('order_id')
      .nullable()
      .references('id')
      .inTable('orders')
      .onDelete('SET NULL');
    table.jsonb('details').nullable(); // Dettagli aggiuntivi in JSON
    table.text('error_message').nullable();
    table.text('error_stack').nullable();
    table.string('ip_address', 45).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes per query frequenti
    table.index('operation', 'idx_logs_operation');
    table.index('user_id', 'idx_logs_user');
    table.index('created_at', 'idx_logs_created');
    table.index(['operation', 'created_at'], 'idx_logs_operation_date');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('operation_logs');
};
