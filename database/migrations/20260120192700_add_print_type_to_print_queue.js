/**
 * Migration: Add print_type to print_queue
 * Distingue tra stampa comanda e stampa preconto
 */

exports.up = function(knex) {
  return knex.schema.alterTable('print_queue', (table) => {
    table.enum('print_type', ['comanda', 'preconto'])
      .notNullable()
      .defaultTo('comanda');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('print_queue', (table) => {
    table.dropColumn('print_type');
  });
};
