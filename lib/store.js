var domain = require('domain');
var d = domain.create();

d.on('error',function() {
    console.log("Error handler:");
    console.log(arguments);
});

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
d.bind(store);
module.exports = exports = store;
