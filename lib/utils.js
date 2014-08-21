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

exports.generateToken = uuid.v4
exports.generateIdentityId = uuid.v4
exports.generate_uuid = uuid.v4

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


//from npm extend
var isPlainObject = function(obj) {
  var hasOwn = Object.prototype.hasOwnProperty;
  var toString = Object.prototype.toString;

  if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
    return false;

  var has_own_constructor = hasOwn.call(obj, 'constructor');
  var has_is_property_of_method = hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
  // Not own constructor property must be Object
  if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
    return false;

  // Own properties are enumerated firstly, so to speed up,
  // if last one is own, then all properties are own.
  var key;
  for ( key in obj ) {}

  return key === undefined || hasOwn.call( obj, key );
};

//prepare for signing
var copyObjectWithSortedKeys = function(object) {
  if (isPlainObject(object)) {
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
  } else if (Array.isArray(object)) {
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

exports.normalizePhone = function(phone) {
    return phone.replace(/\D/g,'')
}

exports.maskphone = function(phone) {
    if ((phone !== undefined) && (phone !== null)) {
        var first = phone.substr(0,phone.length - 4).replace(/\d/g,'*');
        var last = phone.substr(-4);
        return first.concat(last)
    } else 
    return ''
};

// filters a list of objects based on where_obj
exports.list_filter = function(list, where_obj) {
    var matches = [];
    var keys = Object.keys(where_obj)
    for (var i = 0; i < list.length; i++) {
        var obj = list[i];
        var isMatch = true
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j]
            if (obj[key] != where_obj[key]) {
                isMatch = false
                break
            }
        }
        if (isMatch) {
            matches.push(obj)
        }
    }
    return matches
}
