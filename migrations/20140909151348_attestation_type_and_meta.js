'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.table('attestations',function(table) {
            table.string('type');
            table.json('meta');
        })
    ]);  
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.table('attestations',function(table) {
            table.dropColumn('type');
            table.dropColumn('meta');
        })
    ]);  
};
