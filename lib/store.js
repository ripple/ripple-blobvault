var store = function(storetype) {
    switch (storetype) {
        case 'mysql' : 
            var db_implementation = require('./store-mysql');
            break;
        case 'postgres' :
            var db_implementation;
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
    // db_implementation implements
    // .create
    // .read
    // .read_where
    // .update
    // .delete
    return db_implementation;
}
module.exports = exports = store;
