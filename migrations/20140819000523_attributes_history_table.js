'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('identity_attributes_history',function(table) {
            table.string('attribute_id')
            table.json('changes')
            table.bigInteger('created')
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('identity_attributes_history')
    ])
};
