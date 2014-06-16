var reporter = require('./reporter')
var store = function(storetype) {
    reporter.log("Using storetype: " + storetype);
    switch (storetype) {
        case 'mysql' : 
            var db_implementation = require('./store-mysql')();
            break;
        case 'postgres' :
            var db_implementation = require('./store-postgres')();
            break;
    // default to in-memory
        case 'memory' :
            var Sm = require('./store-memory')
            var db_implementation = new Sm;
            break;
        default : 
            var Sm = require('./store-memory')
            var db_implementation = new Sm;
            break;
    }
    return db_implementation;
}
module.exports = exports = store;
