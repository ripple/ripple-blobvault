var config = require('../config');
var response = require('response');

var AUTHINFO_VERSION = 3;

exports.store;
var getUserInfo = function(username, res) {
    if ("string" !== typeof username) {
        process.nextTick(function() {
            throw { res : res, error: new Error("Username is required") }
        });
        return;
    }
    if ((username.length <= 15) || (username.indexOf('~') === 0)) {
        if (username.indexOf('~') === 0) {
            username = username.slice(1);
        }
        exports.store.read({username:username},function(resp) {
            var obj = {}
            if (resp.result == 'no such user') {
                if (config.reserved[username.toLowerCase()]) {
                    obj.exists = false;
                    obj.reserved = config.reserved[username.toLowerCase()];
                    process.nextTick(function() { 
                        throw { res : res, error: new Error('username is reserved') }
                    });
                    return;
                } else {
                    obj.exists = false;
                    obj.reserved = false;
                    process.nextTick(function() {
                        throw { res : res, error: new Error('No such user') }
                    });
                    return;
                }
            } else {
                obj.username = username,
                obj.version = AUTHINFO_VERSION,
                obj.blobvault = config.url,
                obj.pakdf = config.defaultPakdfSetting
                obj.address = resp.address,
                obj.exists = true
                response.json(obj).pipe(res);
            }
        });
    }
}
var authinfo = function (req, res) {
    getUserInfo(req.query.user, res);
};
var get = function (req, res) {
    getUserInfo(req.params.username, res);
};
var verify = function(req,res) {
}
exports.get = get;
exports.verify = verify;
