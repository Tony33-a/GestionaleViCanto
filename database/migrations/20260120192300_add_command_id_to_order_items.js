/**
 * Migration: Add command_id to order_items
 * Collega ogni item alla comanda specifica
 */

exports.up = function(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    table.integer('command_id')
      .nullable()
      .references('id')
      .inTable('commands')
      .onDelete('SET NULL');
    
    table.index('command_id', 'idx_order_items_command');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    table.dropIndex('command_id', 'idx_order_items_command');
    table.dropColumn('command_id');
  });
};
