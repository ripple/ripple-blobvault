var reporter  = require('./reporter');
var crypto    = require('crypto');
var libutils  = require('../lib/utils');
var _         = require('lodash');
var RL        = require('ripple-lib');
var config    = require('../config');
var response  = require('response')
var protector = require('timeout-protector')
var Queue     = require('queuelib');
var Message   = RL.Message;
var remote    = new RL.Remote(config.ripplelib);
var remote_reconnector = require('./remote-reconnector')(remote);

var handleError = function(obj) {
  if ((obj.res) && (obj.error !== undefined)) {
    response.json({result:'error',message:obj.error.message})
    .status(obj.statusCode || 400)
    .pipe(obj.res);
  }
}

/**
 * ecdsa
 * verify an ecdsa signature 
 * and ensure that the signature
 * applies to the specified user/blob only
 */

var ecdsa = function(req,res,next) {
  
  var q = new Queue;
  q.series([
    
    //verify the signature
    function (lib) {
      var keyresp = libutils.hasKeys(req.query, ['signature_account',
                                                'signature_type',
                                                'signature',
                                                'signature_date',
                                                'signature_blob_id']);
      var query;
      var canonicalData;
      var canonicalRequest;
      var stringToSign;
      var signature;
      var data;
      
      if (!keyresp.hasAllKeys) {
        response.json({
          result  : 'error', 
          message : 'Missing keys',
          missing : keyresp.missing
        }).status(400).pipe(res);
        lib.terminate();
        return;
      } 

      query = _.cloneDeep(req.query);
      delete query.signature_account;
      delete query.signature_type;
      delete query.signature;
      delete query.signature_date;
      delete query.signature_blob_id;
      query =_.map(query, function (v, k) {
        return k + "=" + v;
      }).join('&');
      if (query) query = '?'+query;

      // Sort the properties of the JSON object into canonical form
      canonicalData = JSON.stringify(libutils.copyObjectWithSortedKeys(req.body));
      
      // Canonical request using Amazon's v4 signature format
      // See: http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
      canonicalRequest = [
        req.method || 'GET',
        (config.urlPrefix || '') + (req._parsedUrl.pathname || ''),
        query || '',
        
        // XXX Headers signing not supported
        '',
        '',
        crypto.createHash('sha512').update(canonicalData).digest('hex').toLowerCase()
      ].join('\n');

      reporter.log("ecdsa: canonicalRequest:", canonicalRequest);
      
      // String to sign inspired by Amazon's v4 signature format
      // See: http://docs.aws.amazon.com/general/latest/gr/sigv4-create-string-to-sign.html
      // We don't have a credential scope, so we skip it.
      // But that modifies the format, so the format ID is RIPPLE1, instead of AWS4.
      signature    = libutils.base64UrlToBase64(req.query.signature);
      stringToSign = [
        'RIPPLE1-ECDSA-SHA512',
        req.query.signature_date,
        crypto.createHash('sha512').update(canonicalRequest).digest('hex').toLowerCase()
      ].join('\n');

      
      reporter.log("ecdsa: stringToSign:", stringToSign);
      reporter.log("ecdsa: sig:", signature);

      data = {
        message   : stringToSign,
        account   : req.query.signature_account,
        signature : signature
      };
  
      reporter.log("ecdsa: attempting to verify message signature")
      Message.verifyMessageSignature_RPC(data, function(err,resp) {
        var errorMessage;
        var errorCode;
        
        if (err) {
          reporter.log("ECDSA error: ",err)
          
          if (err == 'no response') {
            errorMessage = 'No response from rippled on ECDSA';
            errorCode    = 3084;
            
          } else {
            errorMessage = 'Unable to validate: Ripple Network error';
            errorCode    = 6583;
          }
          
          response.json({
            result  : 'error',
            code    : errorCode,
            message : errorMessage
          }).status(401).pipe(res)
          lib.terminate();
          
        } else if (resp === false) {
          reporter.log("Invalid signature")
          response.json({result:'error',code:9911,message:'Invalid ECDSA signature'}).status(401).pipe(res)
          lib.terminate();
          
        } else {
          lib.done();
        }
      }); 
    
/*
    //NOTE: verifiy message using websocket request
    //we changed it so that its not necessary to rely
    //on a persistent websocket connection
    
    var mycb = function() {
    Message.verifyMessageSignature(
        data,
        remote, 
        function(err,resp) {
            reporter.log("ecdsa: err: ", err, " response: ", resp)
            if (err) {
                reporter.log("ECDSA error: ",err)
                handleError({res:res, error:new Error('Invalid ECDSA signature'), statusCode:401});
            } else if (resp === false) {
                reporter.log("Invalid signature")
                handleError({res:res, error:new Error('Invalid ECDSA signature'), statusCode:401});
            } else
                next()
            return
        }
    ); }
    if (remote.state !== 'online') {
        repoter.log("ECDSA: remote.state is not online, issuing connect");
        remote.connect(protector(function(resp) {
            console.log("ECDSA: connect callback, resp:", resp)
            if (resp == 'timeout') {
                response.json({result:'error',message:'ECDSA: Unable to connect to the Ripple network'}).status(400).pipe(obj.res)
            } else {
                mycb();
            }
        },5000,'timeout'))
    } else {
        mycb()
    }
*/
    },
    
    //ensure that the presented username/blob_id matches the signature_account 
    function (lib) {
      
      next();
      lib.done();
    }
  ]);
}

function recover (req, res, next) {
  store.db('blob')
  .where('username','=',req.query.signature_username)
  .select('address') 
  .then(function(resp) {
    if (resp.length) {
      delete req.query.signature_username;
      req.query.signature_account = resp[0].address;
      req.query.signature_blob_id = 0;
      ecdsa(req,res,next)

    } else {
      response.json({result:'error', message:'invalid username'}).status(400).pipe(res)
    }
  });
}

module.exports = exports = function(store) {
  return {
    middleware : ecdsa,
    recov      : recover,
   }
}
