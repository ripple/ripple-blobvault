'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('attestations',function(table) {
            table.string('id').primary()
            table.binary('binary')
            table.json('attestation')
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('attestations')
    ])
};
