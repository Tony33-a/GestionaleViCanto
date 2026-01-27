/**
 * Migration: Add updated_at column to orders table
 * Risolve il problema della colonna mancante per la liberazione tavolo
 */

exports.up = function(knex) {
  return knex.schema.alterTable('orders', (table) => {
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('orders', (table) => {
    table.dropColumn('updated_at');
  });
};
