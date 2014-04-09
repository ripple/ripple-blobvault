exports.user = require('./user');
exports.blob = require('./blob');

var bindObject = function(obj1,binder) {
    Object.keys(obj1).forEach(function(key) {
        if (obj1.hasOwnProperty(key)) {
            console.log("Binding key " + key);
            obj1[key] = d.bind(obj1[key]);
        }
    });
}
var domain = require('domain');
var d = domain.create();
exports.setStore = function(store) {
    console.log("Set Store");
    bindObject(store);
    exports.user.store = store;
    exports.blob.store = store;
};
var response = require('response');
d.on('error',function (obj) {
    console.log("API Error");
    console.log(obj.error);
    if (obj.res) {
        if (obj.error !== undefined) 
            response.json({error:obj.error.message}).pipe(obj.res);
    }
});

bindObject(exports.blob);
bindObject(exports.user);
