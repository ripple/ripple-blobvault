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
    if (resp.error) {
      response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
      
    } else if (!resp.length) {
      response.json({result:'success',message:'no attestations for this identity'}).pipe(res);
      
    } else {
      var summary = {
        iss : exports.issuer,
        sub : identity_id,
        exp : ~~(new Date().getTime() / 1000) + (30 * 60),
        iat : ~~(new Date().getTime() / 1000 - 60)
      };
      
      var attestation = false;
      
      resp.forEach(function(row) {
        if (row.type === 'phone' && row.status === 'verified') {
          summary.phone_number_verified = row.payload.phone_number_verified;
          summary.phone_verified_date   = new Date(row.created*1000);
          attestation = true;
          
        } else if (row.type === 'identity' && row.status === 'verified') {
          summary.identity_verified      = row.payload.identity_verified;
          summary.identity_verified_date = new Date(row.created*1000);
          attestation = true;
          
        } else if (row.type === 'profile' && row.status === 'valid') {
          summary.profile_valid      = row.payload.profile_valid;
          summary.profile_valid_date = new Date(row.created*1000);
          attestation = true;          
        } 
      });
      
      if (attestation) {      
        var result = {
          result      : 'success',
          attestation : jwtSigner.sign(summary, exports.key)
        }
        
        response.json(result).pipe(res); 
      
      } else {
        response.json({result:'success',message:'no attestations for this identity'}).pipe(res);
      } 
    }
  });
};
