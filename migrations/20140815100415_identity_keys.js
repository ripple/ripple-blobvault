'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('identity_keys',function(table) {
            table.string('identity_id').primary()
            table.string('secret_key')
            table.string('public_key')
        })
    ])  
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('identity_keys')
    ])  
};
