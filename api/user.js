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
            obj.version = config.AUTHINFO_VERSION,
            obj.blobvault = config.url,
            obj.pakdf = config.defaultPakdfSetting
            if (resp.exists === false) {
                if (config.reserved[username.toLowerCase()]) {
                    obj.exists = false;
                    obj.reserved = true;
                    // this is a 200 
                    res.writeHead(200, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify(obj));
//                    res.end(JSON.stringify({exists:false,reserved:true,result:'error',message:"Username is reserved"}));
//                    throw { res : res, error: new Error('username is reserved'),statusCode:200 }
                    //return;
                } else {
                    obj.exists = false;
                    obj.reserved = false;
                    res.writeHead(200, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify(obj));
                    //res.end(JSON.stringify({result:'error',message:"No such user"}));
                   // throw { res : res, error: new Error('No such user'),statusCode:404 }
                    //return;
                }
            } else {
                obj.username = username,
                obj.address = resp.address,
                obj.reserved = config.reserved[username.toLowerCase()];
                obj.exists = true;
                obj.emailVerified = resp.emailVerified,
                res.writeHead(200, {
                    'Content-Type' : 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                });
                res.end(JSON.stringify(obj));
                //response.json(obj).pipe(res);
            }
        });
    } else {
        exports.store.read_where({key:"address",value:username,res:res},
            function(resp) {
                var obj = {}
                obj.version = config.AUTHINFO_VERSION,
                obj.blobvault = config.url,
                obj.pakdf = config.defaultPakdfSetting
                if (resp.exists === false) {
                    if (config.reserved[username.toLowerCase()]) {
                        obj.exists = false;
                        obj.reserved = config.reserved[username.toLowerCase()];
                        // this is a 200 
                        res.writeHead(200, {
                            'Content-Type' : 'application/json',
                            'Access-Control-Allow-Origin': '*' 
                        });
                        res.end(JSON.stringify(obj));
/*
                        // this is a 200 
                        res.writeHead(200, {
                            'Content-Type' : 'application/json',
                            'Access-Control-Allow-Origin': '*' 
                        });
                        res.end(JSON.stringify({exists:false,reserved:true,result:'error',message:"Username is reserved"}));
*/
                        //throw { res : res, error: new Error('username is reserved') }
                        //return;
                    } else {
                        obj.exists = false;
                        obj.reserved = false;
                        // this is a 200 
                        res.writeHead(200, {
                            'Content-Type' : 'application/json',
                            'Access-Control-Allow-Origin': '*' 
                        });
                        res.end(JSON.stringify(obj));
/*
                        res.writeHead(404, {
                            'Content-Type' : 'application/json',
                            'Access-Control-Allow-Origin': '*' 
                        });
                        res.end(JSON.stringify({result:'error',message:"No such user"}));
*/
                        //throw { res : res, error: new Error('No such user') }
                        //return;
                    }
                } else {
                    obj.username = resp.username,
                    obj.address = resp.address,
                    obj.exists = resp.exists,
                    obj.emailVerified = resp.emailVerified,
                    res.writeHead(200, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify(obj));
//                    response.json(obj).pipe(res);
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
