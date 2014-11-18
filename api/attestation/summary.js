var config   = require('../../config');
var reporter = require('../../lib/reporter');
var request  = require('request');
var response = require('response');
var signer   = require('../../lib/signer');
var client   = require('blockscore')(config.blockscore.key);
var profile  = require('./profile.js');

exports.store;

exports.setStore = function(s) {
  exports.store  = s;
  reporter.store = s;
};

exports.get = function (req, res, next) {
  var identity_id     = req.params.identity_id;
  var verification_id;
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
            
            //need to get values from blockscore
            if (req.query.full) {
              verification_id = row.meta.verification_id;
            }      
          } 
        });
      }
      
      if (!verification_id) {
        return handleResponse(summary);
      
      } else {
        client.verifications.retrieve(verification_id, function (err, resp) {      
          if (err) {
            var json = {
              result  : 'error',
              message : err.message,
              error   : err.param + ": " + err.code
            }

            response.json(json).status(400).pipe(res); 
            return;
          } 
        
          var payload = profile.createPayload(resp);
          summary.given_name     = payload.given_name;
          summary.family_name    = payload.family_name;
          summary.birthdate      = payload.birthdate;
          summary.address        = payload.address;
          summary.identification = payload.identification;
          summary.ip_address     = payload.ip_address;
          summary.address_risk   = payload.address_risk;
          summary.ofac_match     = payload.ofac_match;
          summary.pep_match      = payload.pep_match;
          summary.context_match  = payload.context_match;
          
          return handleResponse(summary);
        });
      }
    }
  });
  
  function handleResponse (summary) {
    summary.iss = config.issuer;
    summary.sub = identity_id;
    summary.exp = ~~(new Date().getTime() / 1000) + (30 * 60);
    summary.iat = ~~(new Date().getTime() / 1000 - 60);

    try {
      var result = {
        result      : 'success',
        attestation : signer.signJWT(summary)
      }

      response.json(result).pipe(res); 

    } catch (e) {
      reporter.log("unable to sign JWT:", e);
      response.json({result:'error', message:'unable to sign attestation'}).status(500).pipe(res);
    }    
  }
};
