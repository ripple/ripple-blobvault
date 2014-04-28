var config = require('../config');
var Knex = require('knex');
var knex = Knex.initialize({
    client: 'mysql',
    connection : config.database.mysql
});
var migrate = require('./migrate.js');
migrate(knex,function(){
    console.log("Db up to date");
});
exports.connection = knex;
