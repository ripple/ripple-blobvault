var reporter = require('../lib/reporter');
var request = require('request');
var response = require('response');
var config = require('../config');
var store = require('../lib/store')(config.dbtype);
var client = require('blockscore')(config.blockscore.key);
var jwtSigner = require('jwt-sign');
var utils = require('../lib/utils');

var key;
var issuer = "https://id.ripple.com";

require('fs').readFile('./test.pem', 'utf8', 
function(err, data) {
    if (!err) key = data;
    else console.log("no private key specificed for JWT signing")
})
var conformParams = require('../lib/conformParams')
var Queue = require('queuelib')


var requestAttestation = function(req,res,next) {
   
  if (req.body.type === 'basic_identity') basicIdentityAttestation (req, res, next);
  else if (req.body.type === 'email') emailAttestation (req, res, next);
  else if (req.body.type === 'phone') phoneAttestation (req, res, next);
  else {
    response.json({result:'error', message:'missing or invalid attestion type'}).status(400).pipe(res);    
  }
};

/**
 * basicIdentityAttestation
 * - uses block score to validate name, address, birthdate, and identification
 */

var basicIdentityAttestation = function (req, res, next) {
  
  /*
    1. get existing attestation
    2. check if its not expired
    3. check if its using current profile data
    4. if it passes the tests, serve up the existing one
    5. otherwise request a new one from blockscore
    6. formulate the attestation JWT's
    6. calculate attribute attestation scores and trust score
    7. save attestations and trust score into identity table
    8. return attestation JWT's and trust score
  */
   
    var identity_id = req.params.identity_id;
    reporter.log("basicIdentityAttestation:identity_id:", identity_id)
    var q = new Queue
    q.series([
    function(lib) {
        store.read_where({table:'identity_attributes',key:'identity_id', value:identity_id},
        function(resp) {
            reporter.log("getProfile:attributes lookup response:", resp)
            lib.set({attributes:resp})
            lib.done()
        });
    },
    function(lib) {
        store.read_where({table:'identity_addresses',key:'identity_id', value:identity_id},
        function(resp) {
            reporter.log("getProfile:addresses lookup response:", resp)
            lib.set({addresses:resp})
            lib.done()
        });
    },
    function(lib) {
        //get from query string params for now
        var data = {addresses:lib.get('addresses'),attributes:lib.get('attributes')} 
        var result = conformParams(data);

        if (result.error) {
        response.json({result:'error', message:result.error}).status(400).pipe(res); 
        lib.terminate();
        return; 
        } 
        var params = result.params;
        //reporter.log("Params sent to blockscore:", params)

        client.verifications.create(params,
        function (err, resp) {
            var result;
            //reporter.log("Blockscore response:",err, resp);
            
            if (err) {
                result = {
                  result  : 'error',
                  message : err.message,
                  error   : err.param + ": " + err.code
                }
                
              response.json(result).status(400).pipe(res);  
              lib.done();
            
            //invalid attestation - possibly handle differently      
            } else if (resp.status === 'invalid') {
              result = {
                  result  : 'success',
                  status  : resp.status,
                  details : resp.details
              };
              
              response.json(result).pipe(res);  
              lib.done();
                
            //formulate attestation
            } else { 
                var payload;
                var blindPayload;
                
                payload = {
                    iss : issuer,
                    sub : req.params.identity_id,
                    exp : ~~(new Date().getTime() / 1000) + (30 * 60),
                    iat : ~~(new Date().getTime() / 1000 - 60),
                    given_name  : params.first,
                    family_name : params.last,
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
              
                payload.basic_identity_validated = true;
                payload.address_risk             = resp.details.address_risk;
                payload.ofac_match               = resp.details.ofac;
                //payload.pep_match              = resp.details.pep; //ask blockscore what this is
                payload.context_match = {
                  address        : resp.details.address,
                  identification : resp.details.identification,
                  birthdate      : resp.details.date_of_birth,
                };

                    
                //create blinded attestation
                blindPayload = {
                  iss : payload.iss,
                  sub : payload.sub,
                  exp : payload.exp,
                  iat : payload.iat,
                  basic_identity_validated : true,
                  address_risk             : resp.details.address_risk,
                  ofac_match               : resp.details.ofac,
                  //pep_match              : resp.details.pep, //ask blockscore what this is
                  context_match : {
                    address        : resp.details.address,
                    identification : resp.details.identification,
                    birthdate      : resp.details.date_of_birth
                  }
                };
                
                //TODO: recalculate trust score, add to payload
                //TODO: catch error with signing
                lib.set({
                  complete : jwtSigner.sign(payload, key),
                  blinded : jwtSigner.sign(blindPayload, key),
                  attestation_id : utils.generate_uuid()
                });
                
              
                var attestation = {
                  id : lib.get('attestation_id'),
                  identity_id : identity_id,
                  issuer : payload.iss,
                  status : 'valid',
                  payload : payload,
                  signed_jwt_base64 : lib.get('complete'),
                  blinded_signed_jwt_base64 : lib.get('blinded'),
                  created : new Date().getTime()
                };
                  
                store.insert({set:attestation,table:'attestations'},
                function(db_resp) {
                  if (db_resp.error) {
                    response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
                   
                  } else {
                    reporter.log("identity attestation created: ", lib.get('attestation_id'));
                    result = {
                      result  : 'success',
                      blinded : lib.get('blinded'),
                      complete : lib.get('complete')
                    }; 
                    
                    response.json(result).pipe(res); 
                    
                  } 
                   
                  lib.done();                   
                });
            }
        });
    }
    ]);  
};

/**
 * emailAttestation
 * - uses an email sent from the server with a validation code 
 */
var emailAttestation = function (req, res, next) {

  if (req.param.attestation_id) {
    if (req.param.token) {
      //check for attestation with corresponding token
      //if found, create an email attestation
    } 
  } else {
    
    /*
     1. Generate a unique attestation ID and token
     2. Create a new attestation entry
     3. send an email with a completion link
     4. return the attestation ID
     
     */
  }
};

/*
 * phoneAttestation
 * - uses Authy for verification, out of band
 */
var phoneAttestation = function (req, res, next) {
  
  //resuming previous phone verification
  if (req.body.attestation_id) {
    
    /*
     1. check if id matches an existing attestation
          - if no, return error
          - if yes and status != pending, return the attestation
          - if yes and status == pending, complete the validation
     2. check for verification token
     3. send token to authy
     4. on successful verification, create and store attestation
     
     */
  
  } else {
  
    /*
     1. create request validation token from authy for phone #
     2. use phone verification flow from authy (no app, no email)
     3. create a pending attestation, return the id to the user
     */
    
    if (!req.body.phone || !req.body.phone.number || !req.body.phone.country_code) {
      response.json({result:'error',message:"phone.number and phone.country_code are required"}).status(400).pipe(res); 
      return;  
    }
  
    var identity_id = req.params.identity_id;
    var phone       = "+" + req.body.phone.country_code + ' ' + formatPhone(req.body.phone.number);
    var token       = ("0000" + Math.floor(Math.random() * 100000)).slice(-5);
    var attestation = {
      id          : utils.generate_uuid(),
      identity_id : identity_id,
      issuer      : issuer,
      status      : 'pending',
      payload     : {
        phone     : phone
      },
      created : new Date().getTime()
    };
    
    console.log(attestation);
    
    var q = new Queue
    q.series([
      function(lib) {
        //lib.done();
        //return;
        
        store.insert({set:attestation,table:'attestations'},
        function(db_resp) {

          if (db_resp.error) {
            response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
            lib.terminate();
            
          } else {
            reporter.log("phone attestation created: ", attestation.id);
            lib.done();
          }                   
        });         
      },
      
      function(lib) {
        var authyURL = config.phone.url + '/protected/json/phones/verification/start?api_key=' + config.phone.key;
        var params = {
          phone_number : req.body.phone.number,
          country_code : req.body.phone.country_code,    
          via          : 'sms'     
        }
         
        console.log(authyURL, params);
        request.post({url:authyURL,body:params,json:true},function(err,resp,body) {
          console.log(err, body);
          if (err) {
            response.json({result:'error', message:'error requesting verification token'}).status(500).pipe(res);
            lib.terminate();
                         
          } else {
            lib.done();
          }
        });        
      }
    ]);      
  }
  
  function formatPhone(s) {
    var s2 = (""+s).replace(/\D/g, '');
    if (s.length === 10) {
      var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
      return "(" + m[1] + ") " + m[2] + "-" + m[3];
    } else {
      return s2;
    }
  }
};

module.exports = exports = requestAttestation;
