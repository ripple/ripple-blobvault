var config = require('../config');
var response = require('response');
var libutis = require('../lib/utils');

exports.store;
var getUserInfo = function(username, res) {
    if ("string" !== typeof username) {
        process.nextTick(function() {
            throw { res : res, error: new Error("Username is required") }
        });
        return;
    }
    if ((username.length <= config.username_length) || ((username.indexOf('~') === 0) && (username.length <= (config.username_length+1)))) {
        if (username.indexOf('~') === 0) {
            username = username.slice(1);
        }
        exports.store.read({username:username,res:res},function(resp) {
            var obj = {}
            obj.version = config.AUTHINFO_VERSION,
            obj.blobvault = config.url,
            obj.pakdf = config.defaultPakdfSetting

            obj.exists = resp.exists;
            obj.username = username,
            obj.address = resp.address,
            obj.emailVerified = resp.emailVerified,

            obj.reserved = config.reserved[username.toLowerCase()] || false;

            // this is a 200 
            res.writeHead(200, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            });
            res.end(JSON.stringify(obj));
        });
    } else {
        exports.store.read_where({key:"address",value:username,res:res},
            function(resp) {
                if (resp.error) {
                    res.writeHead(400, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify({result:'error',message:resp.error.message}));
                    return;
                }
                var obj = {}
                obj.version = config.AUTHINFO_VERSION,
                obj.blobvault = config.url,
                obj.pakdf = config.defaultPakdfSetting
                if (resp.length) {
                    var row = resp[0];
                    obj.exists = true;
                    obj.username = row.username,
                    obj.address = row.address,
                    obj.emailVerified = row.email_verified,
                    res.writeHead(200, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify(obj));
                } else {
                    obj.exists = false;
                    obj.reserved = config.reserved[username.toLowerCase()] || false;
                    res.writeHead(200, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify(obj));
                }
            }
        )
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
            res.writeHead(404, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            });
            res.end(JSON.stringify({result:'error',message:'No such user'}));
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
                res.writeHead(400, {
                    'Content-Type' : 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                });
                res.end(JSON.stringify({result:'error',message:'Invalid token'}));
                return;
            } 
        }
    });
}
exports.get = get;
exports.verify = verify;
exports.authinfo = authinfo;
