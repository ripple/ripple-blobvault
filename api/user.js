var config = require('../config');
var response = require('response');

var AUTHINFO_VERSION = 3;

module.exports = exports = function(store) {
    var getUserInfo = function(username, res) {
        if ("string" !== typeof username) {
            throw { res : res, error: new Error("Username is required") }
            return;
        }
        console.log(username);
        if ((username.length <= 15) || (username.indexOf('~') === 0)) {
            if (username.indexOf('~') === 0) 
                username = username.slice(1);
            store.read({username:username},function(resp) {
                var obj = {}
                if (resp.result == 'no such user') {
                    if (config.reserved[username.toLowerCase()]) {
                        obj.exists = false;
                        obj.reserved = config.reserved[username.toLowerCase()];
                        throw { res : res, error: new Error('username is reserved') }
                    } else {
                        obj.exists = false;
                        obj.reserved = false;
                        throw { res : res, error: new Error('No such user') }
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
    return {
        get : get
    }
}
