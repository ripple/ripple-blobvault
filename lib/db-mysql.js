var config = require('../config');
var Knex = require('knex');

var knex = Knex.initialize({
    client: 'mysql',
    connection : config.database.mysql
});
// add fields
knex.schema.hasTable('blob').then(function(exists) {
    if (!exists) 
        knex.schema
        .createTable('blob', function (table) {
            table.string('id').primary();
            table.string('address');
            table.string('auth_secret');
            table.integer('revision');
            table.binary('data');
            table.string('username');
            table.boolean('email_verified');
            table.string('email');
            table.string('email_token');
        })
        .then(function () {
            console.log('blob table is created in database blobvault');
        });
});
knex.schema.hasTable('blob_patches').then(function(exists) {
    if (!exists) 
        knex.schema
        .createTable('blob_patches', function (table) {
            table.increments('id').primary();
            table.string('blob_id');
            table.integer('revision');
            table.binary('data');
        })
        .then(function () {
            console.log('blob_patches table is created in database blobvault');
        });
});
exports.connection = knex;
