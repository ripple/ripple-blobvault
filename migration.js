var config = require('./config');
var Knex = require('knex');

if (config.dbtype == 'memory') {
    console.log("migration for in memory not supported")
    process.exit()
} else if ((config.dbtype !== 'postgres') && (config.dbtype !== 'mysql')) {
    console.log("config.dbtype: " + config.dbtype + ' is neither postgres nor mysql. No migration')
    process.exit()
}

var knex = Knex.initialize({
    client: config.dbtype,
    connection : config.database.postgres
});
// add fields
// modify fields
knex.schema.table('blob', function (table) {
    table.unique('address');
    table.string('encrypted_secret');
    /*
    table.dropColumn('name'); // remove column 
    table.string('first_name'); // add a column called first_name, type string, etc
    table.string('last_name');
    */
}).then(function () {
    console.log('blob is migrated!');
}).catch(function(e) {
    console.log("Got error ", e);
});
