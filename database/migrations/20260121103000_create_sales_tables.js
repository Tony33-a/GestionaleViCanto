/**
 * Migration: Create sales_orders and sales_items tables
 */

exports.up = function(knex) {
  return knex.schema
    .createTable('sales_orders', (table) => {
      table.increments('id').primary();
      table.integer('order_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE');
      table.integer('table_id')
        .references('id')
        .inTable('tables')
        .onDelete('SET NULL');
      table.integer('table_number');
      table.integer('user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.integer('covers').notNullable().defaultTo(0);
      table.decimal('subtotal', 10, 2).notNullable().defaultTo(0);
      table.decimal('cover_charge', 10, 2).notNullable().defaultTo(0);
      table.decimal('total', 10, 2).notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('closed_at').defaultTo(knex.fn.now());

      table.index('order_id', 'idx_sales_orders_order');
      table.index('closed_at', 'idx_sales_orders_closed');
      table.index('table_id', 'idx_sales_orders_table');
    })
    .createTable('sales_items', (table) => {
      table.increments('id').primary();
      table.integer('sales_order_id')
        .notNullable()
        .references('id')
        .inTable('sales_orders')
        .onDelete('CASCADE');
      table.string('product_name').notNullable();
      table.string('category', 50);
      table.jsonb('flavors');
      table.jsonb('supplements');
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
      table.decimal('total_price', 10, 2).notNullable().defaultTo(0);
      table.text('custom_note');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('sales_order_id', 'idx_sales_items_sales_order');
      table.index('product_name', 'idx_sales_items_product');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sales_items')
    .dropTableIfExists('sales_orders');
};
