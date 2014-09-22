var config    = require('../../config');
var reporter  = require('../../lib/reporter');
var request   = require('request');
var response  = require('response');
var jwtSigner = require('jwt-sign');
var utils     = require('../../lib/utils');
var Queue     = require('queuelib');
var client    = require('blockscore')(config.blockscore.key);
var conformParams = require('../../lib/conformParams');

exports.store;
exports.key;
exports.issuer;

exports.setStore = function(s) {
  exports.store  = s;
  reporter.store = s;
};

exports.setKey = function(key, issuer) {
  exports.key    = key;
  exports.issuer = issuer;
};

exports.get = function (req, res, next) {
  var identity_id = req.params.identity_id;
  var result;

  exports.store.getAttestations({identity_id:identity_id}, function (resp) {
    var summary = { };
    
    if (resp.error) {
      response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
      return;
      
    } else {
      if (!resp.length) {
        summary.profile_verified  = false;
        summary.identity_verified = false;
        //summary.phone_number_verified = false;
        //summary.email_verified = false;
      
      } else {    
        resp.forEach(function(row) {
          if (row.type === 'phone' && row.status === 'verified') {
            summary.phone_number_verified = row.payload.phone_number_verified;
            summary.phone_verified_date   = new Date(row.created*1000);
            attestation = true;
  
          } else if (row.type === 'email' && row.status === 'verified') {
            summary.email_verified      = row.payload.email_verified;
            summary.email_verified_date = new Date(row.created*1000);
            attestation = true;
                      
          } else if (row.type === 'identity' && row.status === 'verified') {
            summary.identity_verified      = row.payload.identity_verified;
            summary.identity_verified_date = new Date(row.created*1000);
            attestation = true;
            
          } else if (row.type === 'profile' && row.status === 'verfied') {
            summary.profile_verified      = row.payload.profile_verifed;
            summary.profile_verified_date = new Date(row.created*1000);
            attestation = true;          
          } 
        });
      }
      
      if (!summary.profile_verified)  summary.profile_verified  = false;
      if (!summary.identity_verified) summary.identity_verified = false;
      
      summary.iss = exports.issuer;
      summary.sub = identity_id;
      summary.exp = ~~(new Date().getTime() / 1000) + (30 * 60);
      summary.iat = ~~(new Date().getTime() / 1000 - 60);

      console.log(summary);
      var result = {
        result      : 'success',
        attestation : jwtSigner.sign(summary, exports.key)
      }
        
      response.json(result).pipe(res); 
    }
  });
};
