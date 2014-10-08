exports.user = require('./user');
exports.blob = require('./blob');
exports.meta = require('./meta');
exports.attestation = require('./attestation');
exports.key = require('./key');

exports.setStore = function(store) {
    exports.user.setStore(store);
    exports.blob.setStore(store);
    exports.attestation.setStore(store);
};
var error = require('../error');
error.setDomain(exports.blob);
error.setDomain(exports.user);
