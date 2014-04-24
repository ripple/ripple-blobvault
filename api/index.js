exports.user = require('./user');
exports.blob = require('./blob');
exports.meta = require('./meta');
exports.setStore = function(store) {
    exports.user.store = store;
    exports.blob.setStore(store);
};
var bindObject = function(obj1,binder) {
    Object.keys(obj1).forEach(function(key) {
        if (obj1.hasOwnProperty(key)) {
            obj1[key] = d.bind(obj1[key]);
        }
    });
}
var domain = require('domain');
var d = domain.create();
d.on('error',function (obj) {
    if (obj.res) {
        if (obj.error !== undefined) {
            console.log("API Error",obj.error + " " + new Date());
            obj.res.writeHead(obj.statusCode || 400, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            obj.res.end(JSON.stringify({result:'error',message:obj.error.message}));
        }
    }
});

bindObject(exports.blob);
bindObject(exports.user);
