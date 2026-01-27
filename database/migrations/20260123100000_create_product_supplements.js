/**
 * Migration: Create product_supplements association table
 * Associa supplementi a prodotti specifici
 */

exports.up = function(knex) {
  return knex.schema.createTable('product_supplements', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable();
    table.integer('supplement_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
    table.foreign('supplement_id').references('id').inTable('supplements').onDelete('CASCADE');

    // Unique constraint to prevent duplicates
    table.unique(['product_id', 'supplement_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('product_supplements');
};
