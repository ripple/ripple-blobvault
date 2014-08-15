'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('identity',function(table) {
            table.string('id').primary();
            table.string('display_name')
            table.string('full_name')
            table.string('given_name')
            table.string('middle_name')
            table.string('last_name')
            table.string('birthdate')
            table.string('birthplace')
            table.string('picture_url')
            table.boolean('display_name_visibility').defaultTo(false)
            table.boolean('full_name_visibility').defaultTo(false)
            table.boolean('given_name_visibility').defaultTo(false)
            table.boolean('middle_name_visibility').defaultTo(false)
            table.boolean('last_name_visibility').defaultTo(false)
            table.boolean('birthdate_visibility').defaultTo(false)
            table.boolean('birthplace_visibility').defaultTo(false)
            table.boolean('picture_url_visibility').defaultTo(false)
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('identity',function(table) {
        })
    ])
};
