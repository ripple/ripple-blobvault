'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('identity_identifications',function(table) {
            table.string('id').primary()
            //foreign key from identity table
            table.string('identity_id')
            table.string('type')
            table.string('value')
            table.string('jurisdiction')
            table.boolean('visibility').defaultTo(false)
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('identity_identifications')
    ])
};
