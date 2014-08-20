'use strict';

exports.up = function(knex, Promise) {

    return Promise.all([
        knex.schema.createTable('identity_attributes',function(table) {
            table.string('attribute_id').primary()
            table.string('identity_id') 
            table.string('name')
            table.string('type')
            table.string('domain')
            table.string('value')
            table.string('visibility')
            table.bigInteger('updated')
        })
    ])
  
};

exports.down = function(knex, Promise) {
  
    return Promise.all([
        knex.schema.dropTable('identity_attributes')
    ])
};
