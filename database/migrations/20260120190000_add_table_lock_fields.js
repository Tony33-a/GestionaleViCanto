/**
 * Migration: Add table lock fields
 * Aggiunge gestione lock concorrente per tavoli
 */

exports.up = function(knex) {
  return knex.schema.alterTable('tables', (table) => {
    // Campi per lock concorrente
    table.integer('locked_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    
    table.timestamp('locked_at')
      .nullable();
    
    // Index per performance lock
    table.index(['locked_by', 'locked_at'], 'idx_tables_lock');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('tables', (table) => {
    table.dropIndex(['locked_by', 'locked_at'], 'idx_tables_lock');
    table.dropColumn('locked_by');
    table.dropColumn('locked_at');
  });
};
