'use strict';

exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('identity_attributes'),
    knex.schema.dropTable('identity_attributes_history'),
    knex.schema.dropTable('identity_addresses'),
    knex.schema.dropTable('identity_addresses_history'),
    knex.schema.dropTable('identity_alias'),
    knex.schema.dropTable('identity_keys'),
    knex.schema.dropTable('identity_identifications')
  ]);  
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('identity_attributes',function(table) {
      table.string('attribute_id').primary();
      table.string('identity_id');
      table.string('name');
      table.string('type');
      table.string('domain');
      table.string('value');
      table.string('visibility');
      table.bigInteger('updated');
    }),
    knex.schema.createTable('identity_attributes_history',function(table) {
      table.string('attribute_id');
      table.json('changes');
      table.bigInteger('created');
    }),
    knex.schema.createTable('identity_addresses',function(table) {
      table.string('id').primary();
      table.string('identity_id');
      table.string('type');
      table.string('line1');
      table.string('line2');
      table.string('line3');
      table.string('locality');
      table.string('region');
      table.string('postal_code');
      table.string('country');
      table.string('visibility');
      table.bigInteger('updated');
    }),
    knex.schema.createTable('identity_addresses_history',function(table) {
      table.string('address_id');
      table.json('changes');
      table.bigInteger('created');
    }),
    knex.schema.createTable('identity_alias',function(table) {
      table.string('id').primary();
      table.string('identity_id');
      table.string('domain');
      table.string('value');
      table.boolean('visibility').defaultTo(false);
    }),    
    knex.schema.createTable('identity_keys',function(table) {
      table.string('identity_id').primary();
      table.string('secret_key');
      table.string('public_key');
    }),
    knex.schema.createTable('identity_identifications',function(table) {
      table.string('id').primary();
      table.string('identity_id');
      table.string('type');
      table.string('value');
      table.string('jurisdiction');
      table.boolean('visibility').defaultTo(false);
    })
  ]);   
};
