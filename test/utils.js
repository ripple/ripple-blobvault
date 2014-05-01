var config = require('../config');
var crypto = require('crypto');
var libutils = require('../lib/utils');
var _ = require('lodash');


exports.person = {
    username : 'bob5050',
    auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
    blob_id : 'ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',
    data : libutils.btoa('foo'),
    address : 'rwUNHL9AdSupre4tGb7NXZpRS1ift5sR7W',
    email: 'bob5050@bob.com',
    hostlink: 'http://localhost:8080/activate',
    date: 'april',
    encrypted_secret : 'r5nUDJLNQfWERYFm1sUSxxhate8r1q',
    encrypted_blobdecrypt_key: 'asdfasdfasdf'
}

exports.createSignature = function (params) {
    var method = params.method;
    var url = params.url;
    var secret = params.secret;
    var date = params.date;
    var body = params.body;

    var copyObjectWithSortedKeys = function(object) {
        if (_.isObject(object)) {
            var newObj = {};
            var keysSorted = Object.keys(object).sort();
            var key;
            for (var i in keysSorted) {
                key = keysSorted[i];
                if (Object.prototype.hasOwnProperty.call(object, key)) {
                    newObj[key] = copyObjectWithSortedKeys(object[key]);
                }
            }
            return newObj;
        } else if (_.isArray(object)) {
            return object.map(copyObjectWithSortedKeys);
        } else {
            return object;
        }
    }

    // Canonical request using Amazon's v4 signature format
    // See: http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html

    // Sort the properties of the JSON object into canonical form

    var canonicalData = (body) ? JSON.stringify(copyObjectWithSortedKeys(body)) : '{}'
    //console.log('canonicalData:' + canonicalData);

    var canonicalRequest = [
    method || 'GET',
    (config.urlPrefix || '') + (url || ''),
    '',
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
    date,
    crypto.createHash('sha512').update(canonicalRequest).digest('hex').toLowerCase()
    ].join('\n');

    var specificHmac = crypto.createHmac('sha512', new Buffer(secret, 'hex'));
    var signature = specificHmac.update(stringToSign).digest('hex').toLowerCase();
    return signature;
};
