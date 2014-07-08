var reporter = require('./reporter');
var crypto = require('crypto');
var libutils = require('../lib/utils');
var _ = require('lodash');
var RL = require('ripple-lib');
var config = require('../config');
var response = require('response')
var protector = require('timeout-protector')

var remote = new RL.Remote(config.ripplelib);
var remote_reconnector = require('./remote-reconnector')(remote);
var Message = RL.Message;
var handleError = function(obj) {
    if ((obj.res) && (obj.error !== undefined))
        response.json({result:'error',message:obj.error.message}).status(obj.statusCode || 400).pipe(obj.res)
}

var ecdsa = function(req,res,next) {
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

    reporter.log("ecdsa: canonicalRequest:", canonicalRequest)
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
    reporter.log("ecdsa: stringToSign:", stringToSign)
    
    var sig = libutils.base64UrlToBase64(req.query.signature);
    reporter.log("ecdsa: sig:", sig)

    var data = {
        message:stringToSign,
        account:req.query.signature_account,
        signature:sig
    };
    reporter.log("ecdsa: attempting to verify message signature")
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
        remote.connect(protector(function(resp) {
            if (resp == 'timeout') {
                response.json({result:'error',message:'ECDSA: Unable to connect to the Ripple network'}).status(400).pipe(obj.res)
            } else {
                mycb();
            }
        },5000,'timeout'))
    } else {
        mycb()
    }
}
module.exports = exports = function(store) {
    return {
        middleware : ecdsa,
        recov : function(req,res,next) {
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
            })
        }
   }
}
