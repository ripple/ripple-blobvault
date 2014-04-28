var response = require('response');
var Queue = require('queuelib');
var config = require('../config');
var libutils = require('../lib/utils')
var email = require('../lib/email');
var Counter = require('../lib/counter');
var count = new Counter;
var store;

exports.setStore = function(newstore) {
    count.db = newstore.db;
    store = newstore;
}
exports.logs = function(req,res) {
    if (req.query.format == 'html') {
        res.writeHead(200, {
            'Content-Type' : 'text/html',
            'Access-Control-Allow-Origin': '*' 
        });
//        res.end(count.toHTML())
        count.toHTML_fromdb(function(html) {
            res.end(html);
        });
    } else {
        res.writeHead(200, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        });
        res.end(JSON.stringify(count.hash))
    }
}
    
var create = function (req, res) {
    if (!count.check()) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("maxcap"),
            statusCode: 400 }
        });
        return;
    }
    var blobId = req.body.blob_id;
    if ("string" !== typeof blobId) {
        process.nextTick(function() {
            throw { res : res , 
            error : new Error("No blob ID given."), 
            statusCode : 400 };
        })
        return;
    } else {
        blobId = blobId.toLowerCase();
    }

    if (!/^[0-9a-f]{64}$/.exec(blobId)) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("Blob ID must be 32 bytes hex."),
            statusCode: 400 }
        });
       return;
    }

    var username = req.body.username;
    if ("string" !== typeof username) {
        process.nextTick(function() {
            throw { res : res ,     
            error : new Error("No username given."),
            statusCode: 400 }
        });
        return;
    } 
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,13}[a-zA-Z0-9]$/.exec(username)) {
        process.nextTick(function() {
            throw { res : res , 
            error : new Error("Username must be between 2 and 15 alphanumeric" + " characters or hyphen (-)." + " Can not start or end with a hyphen."),
            statusCode: 400 }
        });
        return;
    }
    if (/--/.exec(username)) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("Username cannot contain two consecutive hyphens."),
            statusCode: 400 }
        });
        return;
    }

    if (config.reserved[username.toLowerCase()]) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("This username is reserved for "+config.reserved[username.toLowerCase()]+'.'),
            statusCode: 400 }
        });
        return;
    }

    var authSecret = req.body.auth_secret;
    if ("string" !== typeof authSecret) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("No auth secret given."),
            statusCode : 400 }
        });
        return;
    }

    authSecret = authSecret.toLowerCase();
    if (!/^[0-9a-f]{64}$/.exec(authSecret)) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("Auth secret must be 32 bytes hex."),
            statusCode: 400 }
        });
        return;
    }

    if (req.body.data === undefined) {
        process.nextTick(function() {
            throw { res : res,  
            error : new Error("No data provided."),
            statusCode : 400 }
        });
        return;
    }

    if (req.body.address == undefined) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("No ripple address provided."),
            statusCode : 400 }
        });
        return;
    } 

    if (req.body.email == undefined) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("No email address provided."),
            statusCode : 400 }
        });
        return;
    } 

    if (req.body.hostlink == undefined) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("No hostlink provided."),
            statusCode : 400 }
        });
        return;
    } 

    if (req.body.encrypted_secret == undefined) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("No encrypted secret provided."),
            statusCode : 400 }
        });
        return;
    } 

    var q = new Queue;
    q.series([
    function(lib,id) {
        store.read({username:username},function(resp) {
            if (resp.exists === false) {
                lib.done();
            } else {
                process.nextTick(function() {
                    res.writeHead(400, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify({result:'error',message:"User already exists"}));
                });
                lib.terminate(id);
                return;
            }
       });
    },
    function(lib) { 
        // XXX Check signature
        // coordinate with evan 
        // TODO : inner key is required on updates
        var params = {
            res:res,
            data:req.body.data,
            authSecret:authSecret,
            blobId:blobId,
            address:req.body.address,
            username:username,
            emailVerified:false,
            email:req.body.email,
            emailToken:libutils.generateToken(),
            hostlink : req.body.hostlink,
            encrypted_secret:req.body.encrypted_secret
        };
        store.create(params,function(resp) {
            if (resp.error) {
                res.writeHead(400, {
                    'Content-Type' : 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                });
                res.end(JSON.stringify({result:'error',message:resp.error.message}));
                lib.done();
                return;
            }
            email.send({email:params.email,hostlink:params.hostlink,token:params.emailToken,name:username});
            res.writeHead(201, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            res.end(JSON.stringify({result:'success'}));
            //count.add();
            count.adddb();
            lib.done();
        });
    }
    ]);
};
exports.create = create;
exports.patch = function (req, res) {
    var keyresp = libutils.hasKeys(req.body,['blob_id','patch']);
    if (!keyresp.hasAllKeys) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'Missing keys',missing:keyresp.missing}));
        return
    } 
    // check patch size <= 1kb
    var size = libutils.atob(req.body.patch).length;
    if (size > 1e3) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'patch size > 1kb',size:size}))
        return
    }
    // XXX Check quota, 1000kb
    var q = new Queue;
    q.series([
    function(lib,id) {
        store.read_where({key:'id',value:req.body.blob_id},function(resp) {
            if (resp.length) {
                var row = resp[0];
                console.log(row);
                lib.done();
            } else if (resp.error) {
                res.writeHead(400, {
                    'Content-Type' : 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                })
                res.end(JSON.stringify({result:'error', message:resp.error.message}))
                lib.terminate(id);
            } 
            lib.done();
        })
    },
    function(lib,id) {
        // check valid base64
        if (!libutils.isBase64(req.body.patch)) {
            res.writeHead(400, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            res.end(JSON.stringify({result:'error', message:'patch is not valid base64'}));
            lib.terminate(id);
            return
        }
        lib.done();
    },
    function(lib) {
        store.blobPatch(size,req,res,function(resp) {
            // check valid base64 on req.patch
            res.writeHead(200, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            res.end(JSON.stringify(resp));
            lib.done();
        });
    }
    ]); 
};
exports.consolidate = function (req, res) {
    var keyresp = libutils.hasKeys(req.body,['data','revision','blob_id']);
    if (!keyresp.hasAllKeys) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'Missing keys',missing:keyresp.missing}));
        return;
    }
    // check valid base64
    if (!libutils.isBase64(req.body.data)) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'data is not valid base64'}));
        return
    }
    var size = libutils.atob(req.body.data).length;
    // checking quota
    if (size > 1e6) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'data > 1e6 bytes',size:size}));
        return
    }
    store.blobConsolidate(req,res,function(resp) {
        res.writeHead(200, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify(resp));
        //response.json(resp).pipe(res);
    });    
};
exports.delete = function (req, res) {
    var keyresp = libutils.hasKeys(req.query,['signature_blob_id']);
    if (!keyresp.hasAllKeys) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'Missing keys',missing:keyresp.missing}));
    } else 
        store.blobDelete(req,res,function(resp) {
            res.writeHead(200, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            res.end(JSON.stringify(resp));
            //response.json(resp).pipe(res);
        });
};
exports.get = function (req, res) {
    var keyresp = libutils.hasKeys(req.params,['blob_id']);
    if (!keyresp.hasAllKeys) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'Missing keys',missing:keyresp.missing}));
    } else 
        store.blobGet(req,res,function(resp) {
            res.writeHead(200, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            res.end(JSON.stringify(resp));
            //response.json(resp).pipe(res);
        });
};

exports.getPatch = function (req, res) {
    var keyresp = libutils.hasKeys(req.params,['blob_id','patch_id']);
    if (!keyresp.hasAllKeys) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'Missing keys',missing:keyresp.missing}));
    } else 
    store.blobGetPatch(req,res,function(resp) {
        res.writeHead(200, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify(resp));
        //response.json(resp).pipe(res);
    });
};
