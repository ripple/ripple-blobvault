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
      summary.profile_verified  = false;
      summary.identity_verified = false;
      //summary.phone_number_verified = false;
      //summary.email_verified = false;
        
      if (resp.length) { 
        resp.forEach(function(row) {
          var created = new Date();
          created.setTime(row.created);
          
          if (row.type === 'phone' && row.status === 'verified') {
            attestation = true;
            summary.phone_number_verified = row.payload.phone_number_verified;
            summary.phone_verified_date   = created.toISOString();
            
            //include values if requested
            if (req.query.full) {
              summary.phone_number = row.payload.phone_number;  
            }
  
          } else if (row.type === 'email' && row.status === 'verified') {
            attestation = true;
            summary.email_verified      = row.payload.email_verified;
            summary.email_verified_date = created.toISOString();

            //include values if requested
            if (req.query.full) {
              summary.email = row.payload.email;  
            }
                                  
          } else if (row.type === 'identity' && row.status === 'verified') {
            attestation = true;
            summary.identity_verified      = row.payload.identity_verified;
            summary.identity_verified_date = created.toISOString();
            
            //include values if requested
            if (req.query.full) {
              summary.score = row.payload.score;  
            }  
                      
          } else if (row.type === 'profile' && row.status === 'verified') {
            attestation = true;
            summary.profile_verified      = row.payload.profile_verified;
            summary.profile_verified_date = created.toISOString();
            
            //include values if requested
            if (req.query.full) {
              summary.given_name = row.payload.given_name;
              summary.full_name  = row.payload.full_name;
              summary.birthdate  = row.payload.birthdate;
              summary.address    = row.payload.address;
              summary.identification = row.payload.identification;
              summary.ip_address     = row.payload.ip_address;
              summary.address_risk   = row.payload.address_risk;
              summary.ofac_match     = row.payload.ofac_match;
              summary.pep_match      = row.payload.pep_match;
              summary.context_match  = row.payload.context_match;
            }      
          } 
        });
      }
      
      summary.iss = exports.issuer;
      summary.sub = identity_id;
      summary.exp = ~~(new Date().getTime() / 1000) + (30 * 60);
      summary.iat = ~~(new Date().getTime() / 1000 - 60);

      var result = {
        result      : 'success',
        attestation : jwtSigner.sign(summary, exports.key)
      }
        
      response.json(result).pipe(res); 
    }
  });
};
