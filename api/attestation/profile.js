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

  exports.store.getAttestations({identity_id:identity_id, type:'profile'}, function (resp){
    if (resp.error) {
      response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 

    //otherwise return the existing attestation
    } else if (resp[0]) {
      var data = createAttestations(identity_id, resp[0].payload);

      if (!data) {
        response.json({result:'error', message:"unable to create attestations"}).status(500).pipe(res); 
        return;
      }
      
      result = {
        result  : 'success',
        status  : resp[0].status,
        id      : resp[0].id,
        attestation : data.attestation,
        blinded     : data.blinded
      };

      response.json(result).pipe(res);  

    } else {
      result = {
        result  : 'error', 
        message : 'no profile attestation for this identity'
      };
      
      response.json(result).status(404).pipe(res); 
    }
  });
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
    var payload    = createPayload(blockscore, lib.get('profile'));
    var id         = existing ? existing.id : utils.generate_uuid();
    var attestation;
    var params;
      
    attestation = {
      id          : id,
      identity_id : identity_id,
      issuer      : config.issuer,
      type        : 'profile',
      status      : payload.profile_verified ? 'verified' : 'unverified',
      payload     : payload,
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
  
  function createPayload (blockscore, profile) {
    
    var payload = {
      //sub : identity_id,
      //exp : ~~(new Date().getTime() / 1000) + (30 * 60),
      //iat : ~~(new Date().getTime() / 1000 - 60),
      given_name  : profile.name.first,
      family_name : profile.name.last,
      birthdate   : profile.date_of_birth,
      address : {
          line1       : profile.address.street1,
          locality    : profile.address.city,
          region      : profile.address.state,
          postal_code : profile.address.postal_code,
          country     : profile.address.country_code
      }
    };
    
    if (profile.address.street2) 
    payload.address.line2 = profile.address.street2;  
    if (profile.identification.ssn)
    payload.ssn_last_4 = profile.identification.ssn;
    if (profile.identification.passport)
    payload.passport = profile.identification.passport
    if (profile.phone_number)
    payload.phone = profile.phone_number 
    if (profile.ip_address) 
    payload.ip_address = profile.ip_address
    
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
};

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

