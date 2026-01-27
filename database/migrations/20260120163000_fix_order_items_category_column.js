/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    // Rendi category_code nullable temporaneamente
    table.string('category_code', 50).nullable().alter();
    
    // Aggiungi colonna category se non esiste (senza controllo)
    table.string('category', 50).notNullable().defaultTo('unknown');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    table.dropColumn('category_code');
  });
};
