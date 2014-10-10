var config    = require('../../config');
var reporter  = require('../../lib/reporter');
var request   = require('request');
var response  = require('response');
var utils     = require('../../lib/utils');
var Queue     = require('queuelib');
var client    = require('blockscore')(config.blockscore.key);
var signer    = require('../../lib/signer');

exports.store;

exports.setStore = function(s) {
  exports.store  = s;
  reporter.store = s;
};

/**
 * Get
 * - get the identity's identity attestation
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
exports.get = function(req,res,next) {
  var identity_id = req.params.identity_id;

  exports.store.getAttestations({identity_id:identity_id, type:'identity'}, function (resp){

    if (resp.error) {
      response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
      lib.terminate();
      
    //if status is valid, return the attestation
    } else if (resp[0]) {
      
      var data = createAttestations(identity_id, resp[0].payload);

      if (!data) {
        response.json({result:'error', message:"unable to create attestations"}).status(500).pipe(res); 
        return;
      }
      
      result = {
        result      : 'success',
        status      : resp[0].status,
        attestation : data.attestation,
        blinded     : data.blinded
      };
      
      response.json(result).pipe(res);  
    
    } else {
      result = {
        result  : 'error', 
        message : 'no identity attestation found.'
      };
      
      response.json(result).status(404).pipe(res); 
    }
  });
};

exports.update = function (req, res, next) {
  var identity_id = req.params.identity_id;
  var type        = req.params.type;
  var q           = new Queue;
  
  q.series([
  function(lib) {
    exports.store.getAttestations({identity_id:identity_id, type:'identity'}, function (resp) {

      if (resp.error) {
        response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
        lib.terminate();
      
      } else {
        lib.set({identityAttestation:resp[0]});
        lib.done();
      }
    });
  },
  
  function(lib) {
    exports.store.getAttestations({identity_id:identity_id, type:'profile'}, function (resp){

      if (resp.error) {
        response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
        lib.terminate();
            
      } if (resp[0] && resp[0].status === 'verified' && resp[0].meta.verification_id) {
        lib.set({profileAttestation:resp[0]});
        lib.done();
      
      } else {
        response.json({result:'error', message:'a valid profile attestation is required'}).status(400).pipe(res); 
        lib.terminate();
      }
    });
  },
  function(lib) {
    var profileAttestation  = lib.get('profileAttestation');
    var identityAttestation = lib.get('identityAttestation'); 
      
    //score the answers to the questions  
    if (req.body.answers && identityAttestation) {
      var data = {
        verification_id : profileAttestation.meta.verification_id,
        question_set_id : identityAttestation.meta.questions_id,
        answers         : req.body.answers
      };
      
      client.questions.score(data, function(err, resp) {
        if (err) {
          response.json({result:'error', message:'unable to score questions'}).status(500).pipe(res);  
          lib.terminate();
          
        } else {
          resp.questions = undefined; //get rid of this so it doesnt get returned in the response
          saveIdentityAttestation(identityAttestation, resp, function(err, result) {
            if (err) {
              response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);              
            } else {
              response.json(result).pipe(res);  
            }
          
            lib.done();                
          });
        }
      });
      
    //create a new question set  
    } else {
      var verification_id = profileAttestation.meta.verification_id;
      
      client.questions.create(verification_id, function (err, resp) {  
        if (err || !resp.questions || !resp.id) {
          response.json({result:'error', message:'unable to retrieve identity questions'}).status(500).pipe(res);
          lib.terminate();
          
        } else {
          saveIdentityAttestation(identityAttestation, resp, function (err, result) {
            if (err) {
              response.json({result:'error', message:'unable to save attestations'}).status(500).pipe(res);              
            } else {
              result.questions = resp.questions;
              response.json(result).pipe(res);  
            }
          
            lib.done();            
          });
        }
      });      
    }
  }]);
  
  
  //save an identity attestation from the blockscore response
  var saveIdentityAttestation = function (existing, blockscore, callback) {
    var payload = {
      identity_verified : blockscore.score >= 80 ? true : false,
      score             : blockscore.score
    };
    
    var id       = existing ? existing.id : utils.generate_uuid();
    var attempts = existing && existing.meta.attempts ? existing.meta.attempts : 0;
    var attestation;
    
    attestation = {
      id          : id,
      identity_id : identity_id,
      issuer      : payload.iss,
      type        : 'identity',
      status      : payload.identity_verified ? 'verified' : 'unverified',
      payload     : payload,
      created : new Date().getTime(),
      meta : {
        questions_id : blockscore.id,
        attempts     : ++attempts
      }
    };
    
    exports.store.insert_or_update_where({set:attestation,table:'attestations',where:{key:'id',value:id}}, function(db_resp) {
      if (db_resp.error) {
        callback(db_resp.error);
       
      } else {
        
        var data = createAttestations(identity_id, payload);
        
        if (!data) {
          return callback('unable to create attestations');    
        }
        
        result = {
          result      : 'success',
          status      : attestation.status,
          attestation : data.attestation,
          blinded     : data.blinded
        };
        
        callback(null, result);
      }                  
    });    
  };
};

//create a new identity attestations
var createAttestations = function (identity_id, payload) {
  var blindPayload;
  
  payload.iss = config.issuer,
  payload.sub = identity_id,
  payload.exp = ~~(new Date().getTime() / 1000) + (30 * 60),
  payload.iat = ~~(new Date().getTime() / 1000 - 60),

  blindPayload = {
    iss : payload.iss,
    sub : payload.sub,
    exp : payload.exp,
    iat : payload.iat,
    identity_verified : payload.identity_verified
  };

  try {
    return {
      attestation : signer.signJWT(payload),
      blinded     : signer.signJWT(blindPayload)
    }; 
    
  } catch (e) {
    reporter.log("unable to sign JWT:", e);
  } 
};

