'use strict';

exports.up = function(knex, Promise) {

    return Promise.all([
        knex.schema.table('blob',function(table) {
            table.string('identity_id')
        })
    ])
  
};

exports.down = function(knex, Promise) {

    return Promise.all([
        knex.schema.table('blob',function(table) {
            table.dropColumn('identity_id')
        })  
    ])
  
};
