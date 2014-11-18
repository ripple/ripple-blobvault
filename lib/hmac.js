var crypto = require('crypto');
var libutils = require('../lib/utils');
var _ = require('lodash');
var response = require('response')

var config = require('../config');

var handleError = function(obj) {
    if ((obj.res) && (obj.error !== undefined))
        response.json({result:'error',message:obj.error.message}).status(obj.statusCode || 400).pipe(obj.res)
}

exports.store;
exports.setStore = function(store) {
    // TODO
    // create a common error domain from both hmac and api
    exports.store = store;
    exports.getSecret = store.hmac_getSecret;
};

exports.getSecret = undefined;

exports.middleware = function (req, res, next) {
    var query = _.cloneDeep(req.query);
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
    'RIPPLE1-HMAC-SHA512',
    req.query.signature_date,
    crypto.createHash('sha512').update(canonicalRequest).digest('hex').toLowerCase()
    ].join('\n');

    exports.getSecret({blobId:req.query.signature_blob_id,res:res}, function (err, secret) {
    var specificHmac = crypto.createHmac('sha512', new Buffer(secret, 'hex'));
    var signature = specificHmac.update(stringToSign).digest('hex').toLowerCase();
    //console.log("provided signature   :" + req.query.signature);
    //console.log("Correct signature is :" + signature);

    if (signature !== req.query.signature) {
        handleError({res:res, error:new Error('Invalid HMAC signature'), statusCode:401});
    } else if (req.params.blob_id && req.params.blob_id !== req.query.signature_blob_id) {
        handleError({res:res, error:new Error('blob id does not match signature_blob_id'), statusCode:401});
    } else {
        next();
    }
  });
};
