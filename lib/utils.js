var _ = require('lodash');
var uuid = require('node-uuid');

var atob = function (str) {
    return new Buffer(str, 'base64').toString('binary');
}
var btoa = function(str) {
    var buffer;
    if (str instanceof Buffer) {
      buffer = str;
    } else {
      buffer = new Buffer(str.toString(), 'binary');
    }
    return buffer.toString('base64');
}

exports.btoa = btoa;
exports.atob = atob;

var RE = new RegExp('^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$')
var isBase64 = function(str) {
    return RE.test(str)
};
exports.isBase64 = isBase64;

var emailRE = new RegExp('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$');
var isValidEmail = function(str) {
    return emailRE.test(str);
}
exports.isValidEmail = isValidEmail;

// random alphanumeric string
var rs = function(len) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = len
    var randomstring = '';
    var charCount = 0;
    var numCount = 0;

    for (var i=0; i<string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum,rnum+1);
    }
    return randomstring
}
exports.rs = rs;

var generateEmailToken = function() {
    return uuid.v4()
}
exports.generateToken = generateEmailToken

// check if object has keys
var hasKeys = function(obj,keys) {
    var list = Object.keys(obj);
    var hasAllKeys = true;
    var missing = {};
    keys.forEach(function(key) {
        if (list.indexOf(key) == -1) {
            hasAllKeys = false
            missing[key] = true;
        }
    })
    return { hasAllKeys : hasAllKeys, missing : missing }
}
exports.hasKeys = hasKeys;

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
exports.copyObjectWithSortedKeys = copyObjectWithSortedKeys

/**
 * Convert base64url encoded data into base64 encoded data.
 * An implementation of http://tools.ietf.org/html/rfc4648#section-5
 *
 * @param {String} base64 Data
 */
exports.base64UrlToBase64 = function (encodedData) {
  encodedData = encodedData.replace(/-/g, '+').replace(/_/g, '/');
  while (encodedData.length % 4) {
    encodedData += '=';
  }
  return encodedData;
};

exports.normalizeUsername = function(name) {
    return name.toLowerCase().replace(/-/g, '');
}


exports.maskphone = function(phone) {
    var first = phone.substr(0,phone.length - 4).replace(/\d/g,'*');
    var last = phone.substr(-4);
    return first.concat(last)
};
