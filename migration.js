var config = require('./config');
var migrate = require('./lib/migrate');
var Knex = require('knex');
var QL = require('queuelib');
var q = new QL;

if (config.dbtype == 'memory') {
    console.log("migration for in memory not supported")
    process.exit()
} else if ((config.dbtype !== 'postgres') && (config.dbtype !== 'mysql')) {
    console.log("config.dbtype: " + config.dbtype + ' is neither postgres nor mysql. No migration')
    process.exit()
}
var knex = Knex.initialize({
    client: config.dbtype,
    connection : config.database[config.dbtype]
});
migrate(knex,function() {
    console.log("Migration completed");
    process.exit();
});
