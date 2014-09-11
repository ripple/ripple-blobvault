var reporter  = require('../lib/reporter');
var request   = require('request');
var response  = require('response');
var config    = require('../config');
var client    = require('blockscore')(config.blockscore.key);
var jwtSigner = require('jwt-sign');
var utils     = require('../lib/utils');
var Queue     = require('queuelib');
var conformParams = require('../lib/conformParams');

var key;
var issuer = "https://id.ripple.com";

require('fs').readFile('./test.pem', 'utf8', function(err, data) {
  if (!err) key = data;
  else console.log("no private key specificed for JWT signing");
});

exports.store;
exports.setStore = function(s) {
  exports.store  = s;
  reporter.store = s;
};

exports.get = function(req,res,next) {
  
  if (req.params.type === 'identity')      identityAttestation (req, res, next);
  else if (req.params.type === 'profile')  profileAttestation (req, res, next);
  else if (req.params.type === 'email')    emailAttestation (req, res, next);
  else if (req.params.type === 'phone')    phoneAttestation (req, res, next);
  else {
    response.json({result:'error', message:'missing or invalid attestion type'}).status(400).pipe(res);    
  }
};

var profileAttestation  = function (req, res, next) {
  var identity_id = req.params.identity_id;
  var type        = req.params.type;
  var q           = new Queue;
  
  reporter.log("profileAttestation:", identity_id);
  
  q.series([
  function(lib) {
    //should only be one 'profile' type attestation per user
    exports.store.getAttestations({identity_id:identity_id, type:type}, function (resp){
      if (resp.error) {
        response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
        lib.terminate();
        
      //if profile is provided, restart the 
      //attestation with the new profile data      
      } else if (req.body.profile) {
        lib.set({attestation:resp[0]});
        lib.done();
        
      //otherwise return the existing attestation
      } else if (resp[0]) {
        result = {
          result  : 'success',
          status  : resp[0].status,
          id      : resp[0].id,
          attestation : resp[0].signed_jwt_base64,
          blinded     : resp[0].blinded_signed_jwt_base64
        };
        
        reporter.log("got existing attestation:", resp[0].id);
        response.json(result).pipe(res);  
        lib.terminate();

      } else {
        response.json({result:'error', message:'no profile attestation for this identity'}).status(404).pipe(res); 
        lib.terminate();
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
        lib.done();
      
      } else {
        var options = {
          params  : result.params, 
          status  : resp.status,
          details : resp.details  
        };
        
        var existing = lib.get('attestation');
        var data     = createProfileAttestations(options);
        var id       = existing ? existing.id : utils.generate_uuid();

        var attestation = {
          id          : id,
          identity_id : identity_id,
          issuer      : issuer,
          type        : 'profile',
          status      : resp.status,
          payload     : data.payload,
          signed_jwt_base64 : data.attestation,
          blinded_signed_jwt_base64 : data.blinded,
          created : new Date().getTime(),
          meta : {
            verification_id : resp.id
          }
        };
        
        exports.store.insert_or_update_where({set:attestation,table:'attestations',where:{key:'id',value:id}},
        function(db_resp) {
          if (db_resp.error) {
            response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
           
          } else {
            reporter.log("profile attestation created: ", id);
            result = {
              result      : 'success',
              status      : resp.status,
              id          : id,
              attestation : data.attestation,
              blinded     : data.blinded,
            }; 
            
            response.json(result).pipe(res); 
          } 
           
          lib.done();                   
        });
      }
    });
  }]);
  
  var createProfileAttestations = function (options) {
    var params = options.params;
    var payload;
    var blindPayload;
   
    payload = {
      iss : issuer,
      sub : identity_id,
      exp : ~~(new Date().getTime() / 1000) + (30 * 60),
      iat : ~~(new Date().getTime() / 1000 - 60),
      given_name  : params.name.first,
      family_name : params.name.last,
      birthdate   : params.date_of_birth,
      address : {
          line1       : params.address.street1,
          locality    : params.address.city,
          region      : params.address.state,
          postal_code : params.address.postal_code,
          country     : params.address.country_code
      }
    };
    
    if (params.address.street2) 
    payload.address.line2 = params.address.street2;  
    if (params.identification.ssn)
    payload.ssn_last_4 = params.identification.ssn;
    if (params.identification.passport)
    payload.passport = params.identification.passport
    if (params.phone_number)
    payload.phone = params.phone_number 
    if (params.ip_address) 
    payload.ip_address = params.ip_address
  
    if (options.status === 'valid') payload.profile_valid   = true;
    else                            payload.profile_invalid = true;
    
    payload.address_risk = options.details.address_risk;
    payload.ofac_match   = options.details.ofac;
    payload.pep_match    = options.details.pep; //ask blockscore what this is
    payload.context_match = {
      address        : options.details.address,
      identification : options.details.identification,
      birthdate      : options.details.date_of_birth,
    };
        
    //create blinded attestation
    blindPayload = {
      iss : payload.iss,
      sub : payload.sub,
      exp : payload.exp,
      iat : payload.iat,
      address_risk : options.details.address_risk,
      ofac_match   : options.details.ofac,
      pep_match    : options.details.pep, //ask blockscore what this is
      context_match : {
        address        : options.details.address,
        identification : options.details.identification,
        birthdate      : options.details.date_of_birth
      }
    };
    
    //TODO: recalculate trust score, add to payload
    //TODO: catch error with signing
    return {
      payload     : payload,
      attestation : jwtSigner.sign(payload, key),
      blinded     : jwtSigner.sign(blindPayload, key),
    };    
  };
};

var identityAttestation = function (req, res, next) {
  var identity_id = req.params.identity_id;
  var type        = req.params.type;
  var q           = new Queue;
  
  reporter.log("identityAttestation:", identity_id);
  
  q.series([
  function(lib) {
    //should only be one 'profile' type attestation per user
    exports.store.getAttestations({identity_id:identity_id, type:type}, function (resp){

      if (resp.error) {
        response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
        lib.terminate();
        
      //if status is valid, return the attestation
      } else if (resp[0] && resp[0].status === 'verified') {
        result = {
          result  : 'success',
          status  : resp[0].status,
          id      : resp[0].id,
          attestation : resp[0].signed_jwt_base64
        };
        
        reporter.log("got existing attestation:", resp[0].id);
        response.json(result).pipe(res);  
        lib.terminate();
      
      } else {
        lib.set({identityAttestation:resp[0]});
        lib.done();
      }
    });
  },
  function(lib) {
    //should only be one 'profile' type attestation per user
    exports.store.getAttestations({identity_id:identity_id, type:'profile'}, function (resp){

      if (resp.error) {
        response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
        lib.terminate();
            
      } if (resp[0] && resp[0].status === 'valid' && resp[0].meta.verification_id) {
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
    if (req.body.answers) {
      var data = {
        verification_id : profileAttestation.meta.verification_id,
        question_set_id : identityAttestation.meta.questions_id,
        answers : req.body.answers
      };
      
      client.questions.score(data, function(err, resp) {
        if (err) {
          response.json({result:'error', message:'unable to score questions'}).status(500).pipe(res);  
          lib.terminate();
          
        } else {
          resp.questions = undefined; //get rid of this so it doesnt get returned in the response
          console.log(identityAttestation);
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
              response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);              
            } else {
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
    var data        = createIdentityAttestation(blockscore.score);
    var id          = existing ? existing.id : utils.generate_uuid();
    var attempts    = existing && existing.meta.attempts ? existing.meta.attempts : 0;
    var attestation = {
      id          : id,
      identity_id : identity_id,
      issuer      : issuer,
      type        : 'identity',
      status      : data.payload.identity_verified ? 'verified' : 'unverified',
      payload     : data.payload,
      signed_jwt_base64 : data.attestation,
      created : new Date().getTime(),
      meta : {
        questions_id : blockscore.id,
        attempts     : ++attempts
      }
    };
    
    exports.store.insert_or_update_where({set:attestation,table:'attestations',where:{key:'id',value:id}},
    function(db_resp) {
      if (db_resp.error) {
        callback(db_resp.error);
       
      } else {
        reporter.log("identity attestation created: ", id);
        result = {
          result      : 'success',
          status      : data.payload.identity_verified ? 'verified' : 'unverified',
          attestation : data.attestation
        };
        
        if (blockscore.questions) result.questions = blockscore.questions; 
        callback(null, result);
      }                  
    });    
  };
  
  //create a new identity attestation
  var createIdentityAttestation = function (score) {
    payload = {
      iss : issuer,
      sub : identity_id,
      exp : ~~(new Date().getTime() / 1000) + (30 * 60),
      iat : ~~(new Date().getTime() / 1000 - 60),
    };
    
    if (score >= 80) payload.identity_verified   = true;
    else             payload.identity_unverified = true;
    if (score)       payload.score = score;
    
    //TODO: recalculate trust score, add to payload
    //TODO: catch error with signing
    return {
      payload     : payload,
      attestation : jwtSigner.sign(payload, key)
    };       
  }
};

var phoneAttestation = function (req, res, next) {

  if (!req.body.phone || !req.body.phone.number || !req.body.phone.country_code) {
    response.json({result:'error', message:'phone.number and phone.country_code are required'}).status(400).pipe(res);  
    return; 
  }
  
  var identity_id = req.params.identity_id;
  var phoneNumber = normalizePhone(req.body.phone.country_code, req.body.phone.number);
  var q           = new Queue;
  
  reporter.log("phoneAttestation:", identity_id);
  
  q.series([
  function(lib) { 
    exports.store.getPhoneAttestation(identity_id, phoneNumber, function(resp){
      if (resp.error) {
        response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
        lib.terminate();
            
      //we have a verified phone attestation, return it      
      } if (resp[0] && resp[0].status === 'verified') {
        console.log(resp[0]);
        lib.terminate();
      
      } else {
        console.log(resp[0]);
        lib.set({attestation:resp[0]});
        lib.done();
      }      
    });
  },
  function(lib) {
    var existing = lib.get('attestation');
    
    //complete the attestation
    if (existing && req.body.token) {
      var authyURL = config.phone.url + '/protected/json/phones/verification/check?api_key=' + config.phone.key;
      var params   = {
        api_key           : config.phone.key,
        phone_number      : req.body.phone.number,
        country_code      : req.body.phone.country_code,
        verification_code : req.body.token
      };
      
      request.get({url:authyURL,qs:params,json:true},function(err,resp,body) {
        if (err) {
          response.json({result:'error', message:'error validating token'}).status(500).pipe(res);
          lib.terminate();
                       
        } else if (body.success === true) {

          var payload = {
            iss : issuer,
            sub : identity_id,
            exp : ~~(new Date().getTime() / 1000) + (30 * 60),
            iat : ~~(new Date().getTime() / 1000 - 60),
            phone_number : existing.payload.phone_number,
            phone_number_verified : true,
          }; 
                  
          var blinded_payload = {
            iss : issuer,
            sub : identity_id,
            exp : ~~(new Date().getTime() / 1000) + (30 * 60),
            iat : ~~(new Date().getTime() / 1000 - 60),
            phone_number_verified : true          
          };
              
          existing.payload                   = payload;
          existing.signed_jwt_base64         = jwtSigner.sign(payload, key);
          existing.blinded_signed_jwt_base64 = jwtSigner.sign(blinded_payload, key);          
          existing.status                    = 'valid';
          existing.created                   = new Date().getTime();      
 
          exports.store.update_where({table:'attestations', set: existing, where:{key:'id',value:existing.id}}, function(db_resp) {
            if (db_resp.error) {
              response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
             
            } else {
              reporter.log("phone attestation created: ", existing.id);
              result = {
                result   : 'success',
                status   : existing.status,
                blinded  : existing.blinded_signed_jwt_base64,
                complete : existing.signed_jwt_base64
              }; 
              
              response.json(result).pipe(res); 
            } 
             
            lib.done();  
          });
        
        } else {
          response.json({result:'error', message:body.message}).status(500).pipe(res);
          lib.terminate();
        } 
      });    
    
    //request a verification token         
    } else {
    
      var attestation = {
        id          : existing ? existing.id : utils.generate_uuid(),
        identity_id : identity_id,
        issuer      : issuer,
        status      : 'pending',
        payload     : {
          phone_number : phoneNumber
        },
        created : new Date().getTime()
      };
      
      var authyURL = config.phone.url + '/protected/json/phones/verification/start?api_key=' + config.phone.key;
      var params = {
        phone_number : req.body.phone.number,
        country_code : req.body.phone.country_code,    
        via          : 'sms'     
      };
      
      console.log(attestation, params);  
      exports.store.insert({set:attestation,table:'attestations'}, function(db_resp) {
        if (db_resp.error) {
          response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
          lib.terminate();
          
        } else {
          reporter.log("phone attestation created: ", attestation.id);
          request.post({url:authyURL,body:params,json:true},function(err,resp,body) {
            console.log(err, body);
            if (err) {
              response.json({result:'error', message:'error requesting verification token'}).status(500).pipe(res);
              lib.terminate();
                           
            } else {
              response.json({
                result  : 'success',
                status  : attestation.status,
                message : 'attestation pending verification'
              }).pipe(res);
              
              lib.done();
            }
          });        
        }
      });      
    }
  }]);
  
  function normalizePhone (country, number) {
    var normalized = "+" + country + ' ';
    
    var s2 = (""+number).replace(/\D/g, '');
    if (number.length === 10) {
      var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
      normalized += "(" + m[1] + ") " + m[2] + "-" + m[3];
    } else {
      normalized += s2;
    }
    
    return normalized;
  }  
};

var emailAttestation = function (req, res, next) {};
