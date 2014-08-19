'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('identity_addresses',function(table) {
            table.string('id').primary()
            //foreign key from identity table
            table.string('identity_id')
            table.string('type')
            table.string('line1')
            table.string('line2')
            table.string('line3')
            table.string('locality')
            table.string('region')
            table.string('postal_code')
            table.string('country') 
            table.string('visibility')
            table.bigInteger('updated')
        })
    ])
  
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('identity_addresses')
    ])
};
