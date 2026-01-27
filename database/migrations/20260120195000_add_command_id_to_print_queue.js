/**
 * Migration: Add command_id to print_queue
 * Collega il job di stampa alla singola comanda (commands)
 */

exports.up = function(knex) {
  return knex.schema.alterTable('print_queue', (table) => {
    table.integer('command_id')
      .nullable()
      .references('id')
      .inTable('commands')
      .onDelete('SET NULL');

    table.index('command_id', 'idx_print_queue_command');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('print_queue', (table) => {
    table.dropIndex('command_id', 'idx_print_queue_command');
    table.dropColumn('command_id');
  });
};
