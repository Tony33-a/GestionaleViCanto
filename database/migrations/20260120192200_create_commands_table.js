/**
 * Migration: Create commands table
 * Gestisce le comande multiple per ordine
 * Ogni invio genera una nuova comanda
 */

exports.up = function(knex) {
  return knex.schema.createTable('commands', (table) => {
    table.increments('id').primary();
    table.integer('order_id')
      .notNullable()
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE');
    table.integer('command_number').notNullable(); // Numero comanda interno all'ordine
    table.enum('status', ['pending', 'sent', 'printed', 'print_failed'])
      .notNullable()
      .defaultTo('pending');
    table.enum('print_status', ['pending', 'printed', 'failed'])
      .notNullable()
      .defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('sent_at');
    table.timestamp('printed_at');
    table.text('notes');

    // Indexes
    table.index('order_id', 'idx_commands_order');
    table.index('status', 'idx_commands_status');
    table.index(['order_id', 'command_number'], 'idx_commands_order_number');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('commands');
};
