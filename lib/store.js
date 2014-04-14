var store = function(storetype) {
    console.log("Using storetype: " + storetype);
    switch (storetype) {
        case 'mysql' : 
            var db_implementation = require('./store-mysql2');
            break;
        case 'postgres' :
            var db_implementation = require('./store-postgres');
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
