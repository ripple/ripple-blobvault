var config = require('../config');
var response = require('response');


exports.store;
var getUserInfo = function(username, res) {
    if ("string" !== typeof username) {
        process.nextTick(function() {
            throw { res : res, error: new Error("Username is required") }
        });
        return;
    }
    if ((username.length <= 15) || ((username.indexOf('~') === 0) && (username.length <= 16))) {
        if (username.indexOf('~') === 0) {
            username = username.slice(1);
        }
        exports.store.read({username:username,res:res},function(resp) {
            var obj = {}
            if (resp.exists === false) {
                if (config.reserved[username.toLowerCase()]) {
                    obj.exists = false;
                    obj.reserved = config.reserved[username.toLowerCase()];
                    throw { res : res, error: new Error('username is reserved') }
                    return;
                } else {
                    obj.exists = false;
                    obj.reserved = false;
                    throw { res : res, error: new Error('No such user') }
                    return;
                }
            } else {
                obj.username = username,
                obj.version = config.AUTHINFO_VERSION,
                obj.blobvault = config.url,
                obj.pakdf = config.defaultPakdfSetting
                obj.address = resp.address,
                obj.exists = resp.exists
                response.json(obj).pipe(res);
            }
        });
    } else {
        exports.store.read_where({key:"address",value:username,res:res},
            function(resp) {
                console.log("READ_WHERE");  
                console.log(resp);
                var obj = {}
                if (resp.exists === false) {
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
                    obj.version = config.AUTHINFO_VERSION,
                    obj.blobvault = config.url,
                    obj.pakdf = config.defaultPakdfSetting
                    obj.address = resp.address,
                    obj.exists = resp.exists
                    response.json(obj).pipe(res);
                }
            }
        );
    }
}

var authinfo = function (req, res) {
    getUserInfo(req.query.username, res);
};
var get = function (req, res) {
    getUserInfo(req.params.username, res);
};
var verify = function(req,res) {
    var username = req.params.username;
    var token = req.params.token;
    if ("string" !== typeof username) {
        process.nextTick(function() {
            throw { res : res, error: new Error("Username is required") }
        });
        return;
    }
    if ("string" !== typeof token) {
        process.nextTick(function() {
            throw { res : res, error: new Error("Token is required") }
        });
        return;
    }
    exports.store.read({username:username,res:res},function(resp) {
        if (resp.exists === false) {
            process.nextTick(function() {
                throw { res : res, error: new Error('No such user') }
            });
            return;
        } else {
            var obj = {}
            console.log("Token provided by user: ->"+ token + "<-");
            console.log("Token in database       ->"+ resp.emailToken + "<-");
            if (token === resp.emailToken) {
                // update emailVerified
                // TODO all fields have to be normalized the same
                // including blobId -> blob_id (not id)
                // emailVerify -> email_verified etc
                exports.store.update({username:username,res:res,hash:{email_verified:true}},function(resp) { 
                    // only after we mark that the email is verified, we inform
                    obj.result = 'success';
                    response.json(obj).pipe(res);
                });
            } else {
                throw { res : res, error: new Error('Invalid token') }
/*
                process.nextTick(function() {
                    throw { res : res, error: new Error('Invalid token') }
                }); 
*/
                return;
            } 
        }
    });
}
exports.get = get;
exports.verify = verify;
exports.authinfo = authinfo;
