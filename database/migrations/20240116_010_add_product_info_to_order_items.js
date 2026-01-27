/**
 * Migration: Add product_code and product_name to order_items
 */

exports.up = function(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    table.string('product_code', 50).after('order_id');
    table.string('product_name', 100).after('product_code');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    table.dropColumn('product_code');
    table.dropColumn('product_name');
  });
};
