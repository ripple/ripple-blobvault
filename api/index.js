exports.user = require('./user');
exports.blob = require('./blob');
exports.meta = require('./meta');
exports.keys = require('./keys');

exports.setStore = function(store) {
    exports.user.setStore(store);
    exports.blob.setStore(store);
};
var error = require('../error');
error.setDomain(exports.blob);
error.setDomain(exports.user);
