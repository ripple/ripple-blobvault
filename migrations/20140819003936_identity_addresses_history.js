'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('identity_addresses_history',function(table) {
            //foreign key from identity_addresses tables
            table.string('address_id')
            table.json('changes')
            table.bigInteger('created')
        })
    ])
  
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('identity_addresses_history')
    ])
};
