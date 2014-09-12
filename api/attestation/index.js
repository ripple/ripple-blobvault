var key;
var issuer = "https://id.ripple.com";

require('fs').readFile('./test.pem', 'utf8', function(err, data) {
  if (err) {
    console.log("no private key specificed for JWT signing");
  } else {
    exports.profile.setKey(data, issuer);
    exports.identity.setKey(data, issuer);
    exports.phone.setKey(data, issuer);
    exports.email.setKey(data, issuer);
  }
});

exports.profile  = require('./profile');
exports.identity = require('./identity');
exports.phone    = require('./phone');
exports.email    = require('./email');
    
exports.setStore = function(store) {
  exports.profile.setStore(store);
  exports.identity.setStore(store);
  exports.phone.setStore(store);
  exports.email.setStore(store);
};
