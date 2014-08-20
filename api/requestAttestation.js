var reporter = require('../lib/reporter');
var request = require('request');
var response = require('response');
var config = require('../config');
var client = require('blockscore')(config.blockscore.key);
var jwtSigner = require('jwt-sign');
var key = require('fs').readFileSync('./test.pem', 'utf8');

var requestAttestation = function(req,res,next) {
  
  /*
    TODO: handle different attestation types: email, phone, identity 
   
    1. get existing attestation
    2. check if its not expired
    3. check if its using current profile data
    4. if it passes the tests, serve up the existing one
    5. otherwise request a new one from blockscore
    6. formulate the attestation JWT
    6. calculate attribute attestation scores and trust score
    7. save trust score into identity table
    8. return attestation JWT and trust score
  */
 
  //get from query string params for now
  var result = conformParams(req.body);
  var code;
  
  //console.log(result);
  
  if (result.error) {
    response.json({result:'error', message:result.error}).status(400).pipe(res); 
    return; 
  } 
  
  client.verifications.create(result.params, function (err, resp) {
    var result;
    //console.log(err, resp);
    
    if (err) {
      code   = 400;
      result = {
        result  : 'error',
        message : err.message,
        error   : err.param + ": " + err.code
      };
      
    } else if (resp.status === 'invalid') {
      
      //possibly handle invalid attestation differently
      code   = 200;
      result = {
        result  : 'success',
        status  : resp.status,
        details : resp.details
      };
                  
    //formulate attestation
    } else { 

      var payload = {
        iss : "https://id.ripple.com",
        sub : req.params.identity_id,
        exp : ~~(new Date().getTime() / 1000) + (30 * 60),
        iat : ~~(new Date().getTime() / 1000 - 60),
        given_name  : req.body.given_name,
        family_name : req.body.family_name,
        birthdate   : req.body.birthdate,
        address : {
          line1       : req.body.address.line1,
          locality    : req.body.address.locality,
          region      : req.body.address.region,
          postal_code : req.body.address.postal_code,
          country     : req.body.address.country
        }
      };
      
      if (req.body.address.line2) payload.address.line2 = req.body.address.line2;  
      if (req.body.ssn_last_4)    payload.ssn_last_4    = req.body.ssn_last_4;
      if (req.body.passport)      payload.passport      = req.body.passport;
      if (req.body.middle_name)   payload.middle_name   = req.body.middle_name;
      if (req.body.phone)         params.phone          = req.body.phone;
      if (req.body.ip)            params.ip_address     = req.body.ip;
    
      
      payload.address_match   = resp.details.address;
      payload.address_risk    = resp.details.address_risk;
      payload.birthdate_match = resp.details.date_of_birth;
      payload.ofac_match      = resp.details.ofac;
      payload.pep_match       = resp.details.pep;
      
  
     
      if (req.body.ssn_last_4) {
        payload.ssn_last_4_match = resp.details.identification;
      } else if (req.body.ssn) {
        payload.ssn_match = resp.details.identification;
      } else if (req.body.passport) {
        payload.passport_match = resp.details.identification;
      }
      

      //TODO: catch error with signing
      var signed = jwtSigner.sign(payload, key); 
      
      console.log(payload);
      code   = 200;
      result = {
        result  : 'success',
        claims_token : signed
      };
    }
    
    response.json(result).status(code).pipe(res);  
  });
  
  

  function conformParams (data) {
    var params = {
      identification : { },
      name           : { },
      address        : { },
    };
    
    if (!req.body.given_name) {
      return {error:"given_name is required"};
    } else if (!req.body.family_name) {
      return {error:"family_name is required"};
    } else if (!req.body.birthdate) {
      return {error:"birthdate is required"};
    } else if (!req.body.ssn_last_4 && !req.body.passport) {
      return {error:"either ssn_last_4 or passport is required"};
    } else if (!req.body.address) {
      return {error:"address is required"};
    }  else if (!req.body.address.line1) {
      return {error:"address.line1 is required"};
    }  else if (!req.body.address.locality) {
      return {error:"address.locality (city/locality) is required"};
    }  else if (!req.body.address.region) {
      return {error:"address.region (state/province/region) is required"};
    }  else if (!req.body.address.postal_code) {
      return {error:"address.postal_code is required"};
    }  else if (!req.body.address.country) {
      return {error:"address.country (ISO code) is required"};
    }  
    
    params.name.first           = req.body.given_name;
    params.name.last            = req.body.family_name;
    params.date_of_birth        = req.body.birthdate;
    params.address.street1      = req.body.address.line1; 
    params.address.city         = req.body.address.locality; 
    params.address.state        = req.body.address.region; 
    params.address.postal_code  = req.body.address.postal_code; 
    params.address.country_code = req.body.address.country;  
         
    if (req.body.address.line2) params.address.street2         = req.body.address.line2;  
    if (req.body.ssn_last_4)    params.identification.ssn      = req.body.ssn_last_4;
    if (req.body.passport)      params.identification.passport = req.body.passport;
    if (req.body.middle_name)   params.name.middle             = req.body.middle_name;
    if (req.body.phone)         params.phone_number            = req.body.phone;
    if (req.body.ip)            params.ip_address              = req.body.ip;
      
    return {params:params};
  }

}

module.exports = exports = requestAttestation;
