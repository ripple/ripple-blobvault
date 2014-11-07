var config    = require('../../config');
var reporter  = require('../../lib/reporter');
var request   = require('request');
var response  = require('response');
var utils     = require('../../lib/utils');
var Queue     = require('queuelib');
var client    = require('blockscore')(config.blockscore.key);
var conformParams = require('../../lib/conformParams');
var signer    = require('../../lib/signer');

exports.store;

exports.setStore = function(s) {
  exports.store  = s;
  reporter.store = s;
};

//get an existing profile attestation
exports.get = function(req,res,next) {
  var identity_id = req.params.identity_id;
  var result;
  var q = new Queue;

  q.series([
    function(lib) {
      
      exports.store.getAttestations({identity_id:identity_id, type:'profile'}, function (resp){
        if (resp.error) {
          response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
          lib.terminate();
          
        } else if (resp[0]) {
          lib.set({
            verification_id : resp[0].meta.verification_id,
            status          : resp[0].status,
            id              : resp[0].id
          });
          lib.done();
        
        } else {
          result = {
            result  : 'error', 
            message : 'no profile attestation for this identity'
          };

          response.json(result).status(404).pipe(res); 
          lib.terminate();
        }
      });
    }, 
    
    function (lib) {
      client.verifications.retrieve(lib.get('verification_id'), function (err, resp) {
      
        if (err) {
          var json = {
            result  : 'error',
            message : err.message,
            error   : err.param + ": " + err.code
          }

          response.json(json).status(400).pipe(res);  
          lib.terminate();
          return;
        } 
        
        try {
          var payload = exports.createPayload(resp);
        } catch (e) {
          reporter.log('invalid response from blockscore');  
          response.json({result:'error', message:"unable to create attestations"}).status(500).pipe(res); 
          return;          
        }
        
        var data    = createAttestations(identity_id, payload);
        
        if (!data) {
          response.json({result:'error', message:"unable to create attestations"}).status(500).pipe(res); 
          return;
        }

        var status = payload.profile_verified ? 'verified' : 'unverified';
        
        //if the status of the attestation has changed,
        //update the DB
        if (status !== lib.get('status')) {
          var params = {
            set   : {status: status},
            table : 'attestations',
            where : {
              key   : 'id',
              value : lib.get('id')
            }
          };
    
          exports.store.update_where(params, function(db_resp) {
            if (db_resp.error) {
              reporter.log('error updating attestation status - identity:', identity_id);
            } else {
              reporter.log('updated attestation status - identity:', identity_id, 'status:', status);
            }
          });
        }
            
        result = {
          result  : 'success',
          status  : payload.profile_verified ? 'verified' : 'unverified',
          attestation : data.attestation,
          blinded     : data.blinded
        };

        response.json(result).pipe(res);  
    
      });
    }
  ]);
};

exports.update = function (req, res, next) {
  var identity_id = req.params.identity_id;
  var q           = new Queue;
  
  if (!req.body.profile) {
    response.json({result:'error', message:'profile information is required'}).status(500).pipe(res); 
    return;   
  }
  
  q.series([
  function(lib) {
    exports.store.getAttestations({identity_id:identity_id, type:'profile'}, function (resp) {
      if (resp.error) {
        response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
        lib.terminate();
        
      } else {
        lib.set({attestation:resp[0]});
        lib.done();
      }
    });
  },
  function(lib) {
    var result = conformParams(req.body.profile);
    
    if (result.error) {
      response.json({result:'error', message:result.error}).status(400).pipe(res); 
      lib.terminate();
      return; 
    } 
    
    //create a new blockscore verification
    client.verifications.create(result.params, function (err, resp) {
      
      if (err) {
        var json = {
          result  : 'error',
          message : err.message,
          error   : err.param + ": " + err.code
        }
          
        response.json(json).status(400).pipe(res);  
        lib.terminate();
      
      } else {   
        lib.set({blockscore:resp, profile:result.params});
        lib.done();
      }
    });  
  },
  function(lib) {  
    var blockscore = lib.get('blockscore'); 
    var existing   = lib.get('attestation');
    var id         = existing ? existing.id : utils.generate_uuid();
    var attestation;
    var params;

    try {
      var payload = exports.createPayload(blockscore);

    } catch (e) {
      reporter.log('invalid response from blockscore');  
      response.json({result:'error', message:"unable to create attestations"}).status(500).pipe(res); 
      return;          
    }
        
    attestation = {
      id          : id,
      identity_id : identity_id,
      issuer      : config.issuer,
      type        : 'profile',
      payload     : { profile_verified: payload.profile_verified },
      status      : payload.profile_verified ? 'verified' : 'unverified',
      created     : new Date().getTime(),
      meta : {
        verification_id : blockscore.id
      }
    };
    
    params = {
      set   : attestation,
      table : 'attestations',
      where : {
        key   : 'id',
        value : id
      }
    };
    
    exports.store.insert_or_update_where(params, function(db_resp) {
      if (db_resp.error) {
        response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
        lib.terminate();
        
      } else {
        
        var data = createAttestations(identity_id, payload);
        
        if (!data) {
          response.json({result:'error', message:"unable to create attestations"}).status(500).pipe(res); 
          lib.terminate();   
          return;
        }
        
        reporter.log("profile attestation created: ", id);
        result = {
          result      : 'success',
          status      : attestation.status,
          attestation : data.attestation,
          blinded     : data.blinded,
        }; 
        
        response.json(result).pipe(res); 
      } 
       
      lib.done();                   
    });        
  }]);
};

exports.createPayload = function (blockscore) {

  var payload = {
    //sub : identity_id,
    //exp : ~~(new Date().getTime() / 1000) + (30 * 60),
    //iat : ~~(new Date().getTime() / 1000 - 60),
    given_name  : blockscore.name.first,
    family_name : blockscore.name.last,
    birthdate   : blockscore.date_of_birth,
    address : {
        line1       : blockscore.address.street1,
        locality    : blockscore.address.city,
        region      : blockscore.address.state,
        postal_code : blockscore.address.postal_code,
        country     : blockscore.address.country_code
    }
  };
  if (blockscore.name.middle)
    payload.middle_name = blockscore.name.middle;   
  if (blockscore.address.street2) 
    payload.address.line2 = blockscore.address.street2;  
  if (blockscore.identification.ssn)
    payload.ssn_last_4 = blockscore.identification.ssn;
  if (blockscore.identification.passport)
    payload.passport = blockscore.identification.passport
  if (blockscore.phone_number)
    payload.phone = blockscore.phone_number 
  if (blockscore.ip_address) 
    payload.ip_address = blockscore.ip_address

  payload.address_risk  = blockscore.details.address_risk;
  payload.ofac_match    = blockscore.details.ofac;
  payload.pep_match     = blockscore.details.pep; //ask blockscore what this is
  payload.context_match = {
    address        : blockscore.details.address,
    identification : blockscore.details.identification,
    birthdate      : blockscore.details.date_of_birth,
  };

  payload.profile_verified = blockscore.status === 'valid' ? true : false;  

  return payload;
} 

var createAttestations = function (identity_id, payload) {
  var blindedPayload;

  payload.iss = config.issuer;
  payload.sub = identity_id;
  payload.exp = ~~(new Date().getTime() / 1000) + (30 * 60);
  payload.iat = ~~(new Date().getTime() / 1000 - 60);

  blindPayload = {
    iss : payload.iss,
    sub : payload.sub,
    exp : payload.exp,
    iat : payload.iat,
    address_risk  : payload.address_risk,
    ofac_match    : payload.ofac_match,
    pep_match     : payload.pep_match, //ask blockscore what this is
    context_match : payload.context_match
  };

  try {
    return {
      attestation : signer.signJWT(payload),
      blinded     : signer.signJWT(blindPayload),
    };

  } catch (e) {
    reporter.log("unable to sign JWT:", e);
  }
};

