var config    = require('../../config');
var reporter  = require('../../lib/reporter');
var request   = require('request');
var response  = require('response');
var jwtSigner = require('jwt-sign');
var utils     = require('../../lib/utils');
var Queue     = require('queuelib');

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

/**
 * Get
 * - retrieve an existing attestation
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
exports.get = function(req,res,next) {
  if (!req.body.phone || !req.body.phone.number || !req.body.phone.country_code) {
    response.json({result:'error', message:'phone.number and phone.country_code are required'}).status(400).pipe(res);  
    return; 
  }
  
  var identity_id = req.params.identity_id;
  var phoneNumber = normalizePhone(req.body.phone.country_code, req.body.phone.number);

  exports.store.getPhoneAttestation(identity_id, phoneNumber, function(resp){
    if (resp.error) {
      response.json({result:'error', message:'attestation DB error'}).status(500).pipe(res); 
      lib.terminate();
              
    } if (resp[0]) {
      result = {
        result      : 'success',
        status      : resp[0].status,
        attestation : resp[0].signed_jwt_base64,
        blinded     : resp[0].blinded_signed_jwt_base64
      }; 
      
      response.json(result).pipe(res); 
    
    } else {
      result = {
        result  : 'error',
        message : 'no attestation found for this phone number'
      }; 
      
      response.json(result).status(404).pipe(res); 
    }      
  });
};

/**
 * Update
 * - intiate or complete a verification
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
exports.update = function (req, res, next) {
  if (!req.body.phone || !req.body.phone.number || !req.body.phone.country_code) {
    response.json({result:'error', message:'phone.number and phone.country_code are required'}).status(400).pipe(res);  
    return; 
  }
  
  var identity_id = req.params.identity_id;
  var phoneNumber = normalizePhone(req.body.phone.country_code, req.body.phone.number);
  var q           = new Queue;
  
  q.series([
  function(lib) { 
    exports.store.getPhoneAttestation(identity_id, phoneNumber, function(resp){
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
            iss : exports.issuer,
            sub : identity_id,
            exp : ~~(new Date().getTime() / 1000) + (30 * 60),
            iat : ~~(new Date().getTime() / 1000 - 60),
            phone_number : existing.payload.phone_number,
            phone_number_verified : true,
          }; 
                  
          var blinded_payload = {
            iss : exports.issuer,
            sub : identity_id,
            exp : ~~(new Date().getTime() / 1000) + (30 * 60),
            iat : ~~(new Date().getTime() / 1000 - 60),
            phone_number_verified : true          
          };
              
          existing.payload                   = payload;
          existing.signed_jwt_base64         = jwtSigner.sign(payload, exports.key);
          existing.blinded_signed_jwt_base64 = jwtSigner.sign(blinded_payload, exports.key);          
          existing.status                    = 'verified';
          existing.created                   = new Date().getTime();      
 
          exports.store.update_where({table:'attestations', set: existing, where:{key:'id',value:existing.id}}, function(db_resp) {
            if (db_resp.error) {
              response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
             
            } else {
              reporter.log("phone attestation created: ", existing.id);
              result = {
                result      : 'success',
                status      : existing.status,
                attestation : existing.signed_jwt_base64,
                blinded     : existing.blinded_signed_jwt_base64
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
        issuer      : exports.issuer,
        type        : 'phone',
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
      
      var options = {
        set   : attestation,
        table : 'attestations',
        where : {
          key   : 'id',
          value : attestation.id
        }
      };
      
      exports.store.insert_or_update_where(options, function(db_resp) {
        if (db_resp.error) {
          response.json({result:'error', message:'attestation database error'}).status(500).pipe(res);
          lib.terminate();
          
        } else {
          reporter.log("phone attestation created: ", attestation.id);
          request.post({url:authyURL,body:params,json:true},function(err,resp,body) {
            if (err || body.success !== true) {
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
};

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
  