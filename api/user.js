var config = require('../config');
var response = require('response');
var libutils = require('../lib/utils');
var email = require('../lib/email');
var Queue = require('queuelib')

exports.store;
var getUserInfo = function(username, res) {
    if ("string" !== typeof username) {
        response.json({result:'error',message:'Username is required'}).status(400).pipe(res)
        return;
    }

    var normalized_username = libutils.normalizeUsername(username);

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
            obj.username = resp.username,
            obj.address = resp.address,
            obj.emailVerified = resp.emailVerified,

            obj.reserved = config.reserved[normalized_username] || false;

            // this is a 200 
            response.json(obj).pipe(res)
        });
    } else {
        exports.store.read_where({key:"address",value:username,res:res},
            function(resp) {
                if (resp.error) {
                    response.json({result:'error',message:resp.error.message}).status(400).pipe(res)
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
                    response.json(obj).pipe(res)
                } else {
                    obj.exists = false;
                    obj.reserved = false;
                    response.json(obj).pipe(res)
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
        response.json({result:'error',message:'Username is required'}).status(400).pipe(res)
        return;
    }
    if ("string" !== typeof token) {
        response.json({result:'error', message:'Token is required'}).status(400).pipe(res)
        return;
    }
    exports.store.read({username:username,res:res},function(resp) {
        if (resp.exists === false) {
            response.json({result:'error',message:'No such user'}).status(404).pipe(res)
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
                response.json({result:'error',message:'Invalid token'}).status(400).pipe(res)
                return;
            } 
        }
    });
}
var email_change = function(req,res) {
    console.log("email_change");
    var keyresp = libutils.hasKeys(req.body,['email','blob_id','username','hostlink']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    } 
    if (!libutils.isValidEmail(req.body.email)) {
        response.json({result:'error', message:'invalid email address'}).status(400).pipe(res)
        return
    }
    var token = libutils.generateToken();
    exports.store.update_where({set:{email_verified:false,email:req.body.email,email_token:token},where:{key:'id',value:req.body.blob_id}},function(resp) {
        if ((resp.result) && (resp.result == 'success')) {
            email.send({email:req.body.email,hostlink:req.body.hostlink,token:token,name:req.body.username});
            response.json({result:'success'}).pipe(res)
        } else {
            response.json({result:'error',message:'unspecified error'}).status(400).pipe(res)
        }
    });
}
var resend = function(req,res) {
    var keyresp = libutils.hasKeys(req.body,['email','username','hostlink']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    } 
    var token = libutils.generateToken();
    exports.store.update_where({set:{email:req.body.email,email_token:token},where:{key:'username',value:req.body.username}},function(resp) {
        email.send({email:req.body.email,hostlink:req.body.hostlink,token:token,name:req.body.username});
        response.json({result:'success'}).pipe(res)
    });
}
var rename = function(req,res) {
    var keyresp = libutils.hasKeys(req.body,['blob_id','new_username','new_blob_id','data','revision']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    } 
    var new_username = req.body.new_username;
    var new_blob_id = req.body.new_blob_id;
    var new_normalized_username = libutils.normalizeUsername(new_username);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,18}[a-zA-Z0-9]$/.exec(new_username)) {
        response.json({result:'error', message:"Username must be between 2 and "+config.username_length+" alphanumeric" + " characters or hyphen (-)." + " Can not start or end with a hyphen."}).status(400).pipe(res)
        return;
    }
    if (/--/.exec(new_username)) {
        response.json({result:'error',message:"Username cannot contain two consecutive hyphens."}).status(400).pipe(res)
        return;
    }
    if (config.reserved[new_normalized_username]) {
        response.json({result:'error',message:"This username is reserved for "+config.reserved[new_normalized_username]}).status(400).pipe(res)
        return;
    }

    var q = new Queue;
    q.series([
    function(lib,id) {
        exports.store.read_where({key:'id',value:req.body.blob_id},
        function(resp) {
            if (resp.length) {
                lib.done();
            } else {
                response.json({result:'error',message:"invalid blob_id"}).status(400).pipe(res)
                lib.terminate(id);
                return
            }
        });
    },
    function(lib) {
        // here we do a consolidate
        // check valid base64
        if (!libutils.isBase64(req.body.data)) {
            response.json({result:'error', message:'data is not valid base64'}).status(400).pipe(res)
            return
        }
        var size = libutils.atob(req.body.data).length;
        // checking quota
        if (size > config.quota*1024) {
            response.json({result:'error', message:'data too large',size:size}).status(400).pipe(res)
            return
        }
        // we pass revision through req.body
        // quota is updated in consolidate
        store.blobConsolidate(size,req,res,function(resp) {
            lib.done()
        });    
    
    },
    function(lib) {
        exports.store.update_where({set:{id:new_blob_id,username:new_username,normalized_username:new_normalized_username},where:{key:'id',value:req.body.blob_id}},function(resp) {
            console.log("user: rename : update response", resp)
            if (resp) {
                response.json({result:'success',message:'rename'}).pipe(res)
            } else 
                response.json({result:'error',message:'rename'}).status(400).pipe(res)
            lib.done()
        })
    }
    ])
}
exports.emailResend = resend;
exports.emailChange = email_change;
exports.get = get;
exports.verify = verify;
exports.authinfo = authinfo;
exports.rename = rename
