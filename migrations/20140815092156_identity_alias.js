'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('identity_alias',function(table) {
            table.string('id').primary()
            //foreign key from identity table
            table.string('identity_id')
            table.string('domain')
            table.string('value') 
            table.boolean('visibility').defaultTo(false)
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('identity_alias')
    ])
};
