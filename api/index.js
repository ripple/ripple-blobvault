exports.user = require('./user');
exports.federation = require('./federation');
exports.blob = require('./blob');
exports.meta = require('./meta');
exports.attestation = require('./attestation');

exports.setStore = function(store) {
    exports.user.setStore(store);
    exports.federation.store = store;
    exports.blob.setStore(store);
    exports.attestation.setStore(store);
};
var error = require('../error');
error.setDomain(exports.blob);
error.setDomain(exports.user);
