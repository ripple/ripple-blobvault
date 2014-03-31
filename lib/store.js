var store = function(storetype) {
    switch (storetype) {
        case 'mysql' : 
            var db_implementation = require('./store-mysql');
            break;
        case 'postgres' :
            var db_implementation;
            break;
    // default to in-memory
        default : 
            var db_implementation = require('./store-memory');
            break;
    }
    var self = {};
    self.create = db_implementation.create;
    self.read = db_implementation.read; 
    self.update = db_implementation.update;
    self.delete = db_implementation.delete;
    return self;
}
modules.exports = exports = store;
