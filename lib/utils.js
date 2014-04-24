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
exports.generateToken = generateEmailToken
