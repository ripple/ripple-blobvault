exports.user = require('./user');
exports.blob = require('./blob');

var config = require('../config');
var store = require('../lib/store')(config.dbtype);

exports.adjust_dbtype = function(dbtype) {
    store = require('../lib/store')(dbtype);
    exports.user.store = store;
    exports.blob.store = store;
}
exports.user.store = store;
exports.blob.store = store;


var response = require('response');
var domain = require('domain');
var d = domain.create();
d.on('error',function (obj) {
    console.log("API Error");
    console.log(obj.error);
    if (obj.res) {
        if (obj.error !== undefined) 
            response.json({error:obj.error.message}).pipe(obj.res);
    }
});

var bindObject = function(obj1,binder) {
    Object.keys(obj1).forEach(function(key) {
        if (obj1.hasOwnProperty(key) && (key != 'store')) {
            obj1[key] = d.bind(obj1[key]);
        }
    });
}
bindObject(exports.blob);
bindObject(exports.user);
