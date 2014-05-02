var crypto = require('crypto');
var libutils = require('../lib/utils');
var _ = require('lodash');
var RL = require('ripple-lib');
var config = require('../config');
var remote = new RL.Remote(config.ripplelib);
remote.connect();



var base64 = {};
base64.encode = function(unencoded) {
  return new Buffer(unencoded || '').toString('base64');
};
 
base64.decode = function(encoded) {
  return new Buffer(encoded || '', 'base64').toString('utf8');
};
base64.urlEncode = function(unencoded) {
  var encoded = base64.encode(unencoded);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
 
base64.urlDecode = function(encoded) {
  encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (encoded.length % 4)
    encoded += '=';
  return base64.decode(encoded);
};

var Message = RL.Message;
var handleError = function(obj) {
    console.log("API Error");
    if (obj.res) {
        if (obj.error !== undefined) {
            obj.res.writeHead(obj.statusCode || 400, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            obj.res.end(JSON.stringify({result:'error',message:obj.error.message}));
        }
    }
}
exports.middleware = function (req, res, next) {
    if (config.testmode) {
        next()
        return
    }
    var keyresp = libutils.hasKeys(req.query,['signature_account','signature_type','signature','signature_date','signature_blob_id']);
    if (!keyresp.hasAllKeys) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'Missing keys',missing:keyresp.missing}));
        return
    } 
    if (req.query.signature_blob_id !== req.body.blob_id) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'query signature blob id does not match body blob_id'}));
        return
    }

    var query = _.cloneDeep(req.query);
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
    var canonicalData = JSON.stringify(libutils.copyObjectWithSortedKeys(req.body));
    // Canonical request using Amazon's v4 signature format
    // See: http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
    var canonicalRequest = [
    req.method || 'GET',
    (config.urlPrefix || '') + (req._parsedUrl.pathname || ''),
    query || '',
    // XXX Headers signing not supported
    '',
    '',
    crypto.createHash('sha512').update(canonicalData).digest('hex').toLowerCase()
    ].join('\n');

    // String to sign inspired by Amazon's v4 signature format
    // See: http://docs.aws.amazon.com/general/latest/gr/sigv4-create-string-to-sign.html
    //
    // We don't have a credential scope, so we skip it.
    //
    // But that modifies the format, so the format ID is RIPPLE1, instead of AWS4.
    var stringToSign = [
    'RIPPLE1-ECDSA-SHA512',
    req.query.signature_date,
    crypto.createHash('sha512').update(canonicalRequest).digest('hex').toLowerCase()
    ].join('\n');
    
    var sig = libutils.base64UrlToBase64(req.query.signature);

    var data = {
        message:stringToSign,
        account:req.query.signature_account,
        signature:sig
    };
    console.log(data);
    Message.verifyMessageSignature(
        data,
        remote, 
        function(err,resp) {
            console.log("RESPONSE verifyMessageSignature:",err,resp);
            if (resp == false)
                handleError({res:res, error:new Error('Invalid ECDSA signature'), statusCode:401});
            else
                next()
            return
        }
    );
};
