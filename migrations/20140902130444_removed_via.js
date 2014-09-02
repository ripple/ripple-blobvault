'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.table('blob',function(table) {
            table.dropColumn('2fa_via')
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.table('blob',function(table) {
            table.string('2fa_via')
        })
    ])
};
