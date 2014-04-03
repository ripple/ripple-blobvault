var store = require('../lib/store')();
exports.user = require('./user');
exports.blob = require('./blob');

exports.user.store = store;
exports.blob.store = store;
var response = require('response');

var domain = require('domain');
var d = domain.create();
d.on('error',function (obj) {
    // obj.res and obj.error are usually 'thrown' back here
    console.log("\nAPI ERROR");
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
