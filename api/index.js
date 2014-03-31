exports.user = require('./user');
exports.blob = require('./blob');

var response = require('response');

var domain = require('domain');
var d = domain.create();
d.on('error',function (obj) {
    // obj.res and obj.error are usually 'thrown' back here
    if (obj.res) {
        console.log("piping to obj.res");
        response.json({result: 'error'}).pipe(obj.res);
    }
});
Object.keys(exports.blob).forEach(function(key) {
    if (exports.blob.hasOwnProperty(key)) {
        exports.blob[key] = d.bind(exports.blob[key]);
    }
});
