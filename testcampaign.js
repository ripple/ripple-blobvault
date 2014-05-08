var EC = require('./lib/emailcampaign');
var config = require('./config');
var Knex = require('knex');
var db = Knex.initialize({
    client: 'postgres',
    connection : config.database.postgres
});
var ec = new EC(db,config)
ec.start(function() {
    console.log("Connected");
});
