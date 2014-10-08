exports.profile  = require('./profile');
exports.identity = require('./identity');
exports.phone    = require('./phone');
exports.email    = require('./email');
exports.summary  = require('./summary');
    
exports.setStore = function(store) {
  exports.profile.setStore(store);
  exports.identity.setStore(store);
  exports.phone.setStore(store);
  exports.email.setStore(store);
  exports.summary.setStore(store);
};
