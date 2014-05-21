var crypto = require('crypto');
var libutils = require('../lib/utils');
var _ = require('lodash');
var RL = require('ripple-lib');
var config = require('../config');
var response = require('response')
var remote = new RL.Remote(config.ripplelib);
var remote_reconnector = require('./remote-reconnector')(remote);

var Message = RL.Message;
var handleError = function(obj) {
    if ((obj.res) && (obj.error !== undefined))
        response.json({result:'error',message:obj.error.message}).status(obj.statusCode || 400).pipe(obj.res)
}
exports.middleware = function (req, res, next) {
    if (config.testmode) {
        next()
        return
    }
    var keyresp = libutils.hasKeys(req.query,['signature_account','signature_type','signature','signature_date','signature_blob_id']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
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
    Message.verifyMessageSignature(
        data,
        remote, 
        function(err,resp) {
            if (err) {
                console.log("ECDSA error: ",err)
                handleError({res:res, error:new Error('Invalid ECDSA signature'), statusCode:401});
            } else if (resp === false) {
                console.log("Invalid signature")
                handleError({res:res, error:new Error('Invalid ECDSA signature'), statusCode:401});
            } else
                next()
            return
        }
    );
};
