var crypto = require('crypto');
var _ = require('lodash');

var config = require('../config');

exports.store;
exports.setStore = function(store) {
    // TODO
    // create a common error domain from both hmac and api
    exports.store = store;
};

function copyObjectWithSortedKeys(object) {
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

exports.getSecret = exports.store.hmac_getSecret;

exports.middleware = function (req, res, next) {
  var query = _.cloneDeep(req.query);
  delete query.signature;
  delete query.signature_date;
  delete query.signature_blob_id;
  query =_.map(query, function (v, k) {
    return k + "=" + v;
  }).join('&');
  if (query) query = '?'+query;

  // Sort the properties of the JSON object into canonical form
  var canonicalData = JSON.stringify(copyObjectWithSortedKeys(req.body));

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

  exports.getSecret(req.query.signature_blob_id, function (err, secret) {
    var specificHmac = crypto.createHmac('sha512', new Buffer(secret, 'hex'));
    var signature = specificHmac.update(stringToSign).digest('hex').toLowerCase();

    if (signature !== req.query.signature) {
      res.statusCode = 401;
      res.end('Invalid HMAC signature');
    } else {
      next();
    }
  });
};
