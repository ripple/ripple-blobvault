var config = require('../config');
var Knex = require('knex');
var knex = Knex.initialize({
    client: 'postgres',
    connection : config.database.postgres
});
// add fields
knex.schema.hasTable('blob').then(function(exists) {
    if (!exists) 
        knex.schema
        .createTable('blob', function (table) {
            table.string('id').primary();
            table.string('address').unique()
            table.string('auth_secret');
            table.integer('revision');
            table.binary('data');
            table.string('username').unique()
            table.boolean('email_verified');
            table.string('email');
            table.string('email_token');
            table.string('hostlink');
            table.string('encrypted_secret');
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

// this is logging
knex.schema.hasTable('log').then(function(exists) {
    if (!exists) 
        knex.schema
        .createTable('log', function (table) {
            // 'date' is this (day-by-day)
            // var x = new Date(); x.toDateString();
            //'Thu Apr 24 2014'
            table.string('date'); 

            // full date is for readability
            // var x = new Date(); 
            // Thu Apr 24 2014 03:41:38 GMT-0700 (PDT)
            table.string('fulldate');
           
            // currtime is
            // x.getTime(); 
            // > 1398336098552
            table.string('currtime');
    
            // 'number' is the order number that the user was created
            // e.g. 1 is the first user signup of that date
            table.string('number');
    
            table.boolean('isAccepted');
            table.boolean('isRejected');
        })
        .then(function () {
            console.log('log table is created in database blobvault');
        });
});
exports.connection = knex;
