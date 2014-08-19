'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.table('identity',function(table) {
            table.string('status')
            table.dropColumn('display_name')
            table.dropColumn('full_name')
            table.dropColumn('given_name')
            table.dropColumn('middle_name')
            table.dropColumn('last_name')
            table.dropColumn('birthdate')
            table.dropColumn('birthplace')
            table.dropColumn('picture_url')
            table.dropColumn('display_name_visibility')
            table.dropColumn('full_name_visibility')
            table.dropColumn('given_name_visibility')
            table.dropColumn('middle_name_visibility')
            table.dropColumn('last_name_visibility')
            table.dropColumn('birthdate_visibility')
            table.dropColumn('birthplace_visibility')
            table.dropColumn('picture_url_visibility')
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.table('identity',function(table) {
            table.dropColumn('status')
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
