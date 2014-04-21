var uuid = require('node-uuid');
var generateEmailToken = function() {

    return uuid.v4()
/*
    var a = (Math.random()+1).toString(36).substr(2);
    var b = (Math.random()+1).toString(36).substr(2);
    return a.concat(b)
*/
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
