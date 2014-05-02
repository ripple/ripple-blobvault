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
    res.writeHead(200, {
        'Content-Type' : 'text/html',
        'Access-Control-Allow-Origin': '*' 
    });
    count.toHTML_fromdb(function(html) {
        res.end(html);
    });
}
    
var create = function (req, res) {
    if (!config.testmode) {
        if (req.query.signature_blob_id != req.body.blob_id) {
            res.writeHead(400, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            res.end(JSON.stringify({result:'error', message:'query.signature_blob_id does not match body.blob_id'}));
            return
        }
        if (req.query.signature_account != req.body.address) {
            res.writeHead(400, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            res.end(JSON.stringify({result:'error', message:'query.signature_account does not match body.address'}));
            return
        }
    }
    var keyresp = libutils.hasKeys(req.body,['encrypted_blobdecrypt_key','blob_id','username','auth_secret','data','email','address','hostlink','encrypted_secret']);
    if (!keyresp.hasAllKeys) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'Missing keys',missing:keyresp.missing}));
        return
    } 
    var blobId = req.body.blob_id;
    blobId = blobId.toLowerCase();

    if (!/^[0-9a-f]{64}$/.exec(blobId)) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("Blob ID must be 32 bytes hex."),
            statusCode: 400 }
        });
       return;
    }

    var username = req.body.username;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,18}[a-zA-Z0-9]$/.exec(username)) {
        process.nextTick(function() {
            throw { res : res , 
            error : new Error("Username must be between 2 and 20 alphanumeric" + " characters or hyphen (-)." + " Can not start or end with a hyphen."),
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
    authSecret = authSecret.toLowerCase();
    if (!/^[0-9a-f]{64}$/.exec(authSecret)) {
        process.nextTick(function() {
            throw { res : res, 
            error : new Error("Auth secret must be 32 bytes hex."),
            statusCode: 400 }
        });
        return;
    }
    var q = new Queue;
    q.series([
    function(lib,id) {
        store.read({username:username},function(resp) {
            console.log("READ RESP",resp)
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
    function(lib,id) {
        // check if account is funded
        count.checkLedger(req.body.address,function(isFunded) {
            if (!isFunded) { 
                if (!count.check()) {
                    process.nextTick(function() {
                        throw { res : res, 
                        error : new Error("We have reached the daily signup limit. Please try again tomorrow."),
                        statusCode: 400 }
                    });
                    lib.terminate(id);
                    return;
                } else {
                    // account is NOT funded but within the limit cap
                    console.log(req.body.address + " is not funded but within the limit cap");
                    lib.done();
                }
            } else {
                // mark as funded
                console.log("Marking as funded");
                lib.done({isFunded:true});
            }
        })
    },
    function(lib) { 
        // TODO : inner key is required on updates

        var data_size = libutils.atob(req.body.data).length;
        var params = {
            res:res,
            data:req.body.data,
            data_size:data_size,
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
        // if we reached here, we are either unfunded but within limit cap
        // or funded by the cutoff date
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
            // if account is not funded we set add towards the daily limit
            if (!lib.get('isFunded'))
                count.adddb();
            else 
                count.markdb(); // for funded user migration
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
    if (size > config.patchsize*1024) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'patch size > 1kb',size:size}))
        return
    }
    // check quota, user cannot submit patch if they >= quota limit
    var q = new Queue;
    q.series([
    function(lib,id) {
        store.read_where({key:'id',value:req.body.blob_id},function(resp) {
            if (resp.length) {
                var row = resp[0];
                lib.set({quota:row.quota});
                if (row.quota >= config.quota*1024) {
                    console.log("Excceeded quota. row.quota = ",row.quota, " vs config.quota*1024 = ", config.quota*1024);
                    res.writeHead(400, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    })
                    res.end(JSON.stringify({result:'error', message:'quota exceeded'}))
                    lib.terminate(id);
                    return;
                } else 
                    lib.done();
            } else if (resp.error) {
                res.writeHead(400, {
                    'Content-Type' : 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                })
                res.end(JSON.stringify({result:'error', message:resp.error.message}))
                lib.terminate(id);
                return;
            } 
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
    // update quota amount
    function(lib,id) {
        var newquota = size + lib.get('quota'); 
        store.update_where({
            set:{key:'quota',value:newquota},
            where:{key:'id',value:req.body.blob_id}},
            function(resp) {
                if (resp.error) {
                    res.writeHead(400, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    })
                    res.end(JSON.stringify({result:'error', message:resp.error.message}));
                    lib.terminate(id);
                    return;
                } else {
                    lib.done();
                }
            }
        );
    },
// inspect quota values
/*
    function(lib,id) {
        store.read_where({key:'id',value:req.body.blob_id},function(resp) {
            if (resp.length) {
                var row = resp[0];
                console.log("quota:", row.quota);
            }
            lib.done();
        })
    },
*/
    function(lib) {
        store.blobPatch(size,req,res,function(resp) {
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
/*
    var q = new Queue;
    q.series([
        function(lib,id) {
            store.read_where({key:'id', value:req.body.blob_id},function(resp) {
                if (resp.length) {
                    var row = resp[0];
                    console.log("OLD REVISION: ", row);
                    console.log("Attempted revision", req.body.revision);
                }
                lib.done();
            });
        }
    ]);
*/
    var size = libutils.atob(req.body.data).length;
    // checking quota
    if (size > config.quota*1024) {
        res.writeHead(400, {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin': '*' 
        })
        res.end(JSON.stringify({result:'error', message:'data too large',size:size}));
        return
    }
    // XXX: write out new quota value

    store.blobConsolidate(size,req,res,function(resp) {
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
