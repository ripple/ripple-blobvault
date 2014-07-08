var reporter = require('../lib/reporter');
var response = require('response');
var Queue = require('queuelib');
var config = require('../config');
var libutils = require('../lib/utils')
var email = require('../lib/email');
var Counter = require('../lib/counter');
var protector = require('timeout-protector')
var count = new Counter;
var store;

exports.setStore = function(newstore) {
    count.db = newstore.db;
    store = newstore;
}
exports.logs = function(req,res) {
    switch (req.query.format) {
        case 'html':
        count.toHTML_fromdb(function(html) {
            response.html(html).pipe(res)
        });
        break;
        case 'csv':
        count.toCSV_fromdb(function(html) {
            response.html(html).pipe(res)
        });
        break;
        default:
        count.toHTML_fromdb(function(html) {
            response.html(html).pipe(res)
        });
    break;
    }
}
    
var create = function (req, res) {
    if (!config.testmode) {
        if (req.query.signature_blob_id != req.body.blob_id) {
            response.json({result:'error', message:'query.signature_blob_id does not match body.blob_id'}).status(400).pipe(res)
            return
        }
        if (req.query.signature_account != req.body.address) {
            response.json({result:'error', message:'query.signature_account does not match body.address'}).status(400).pipe(res)
            return
        }
    }
    var keyresp = libutils.hasKeys(req.body,['encrypted_blobdecrypt_key','blob_id','username','auth_secret','data','email','address','hostlink','encrypted_secret','domain']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    } 

    var domain = req.body.domain;
    if (domain.length > 255) {
        response.json({result:'error', message:'Domain string too long'}).status(400).pipe(res)
        return
    }

    var blobId = req.body.blob_id;
    blobId = blobId.toLowerCase();

    if (!/^[0-9a-f]{64}$/.exec(blobId)) {
       response.json({result:'error', message:"Blob ID must be 32 bytes hex."}).status(400).pipe(res)
       return;
    }

    var username = req.body.username;
    var normalized_username = libutils.normalizeUsername(username);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,18}[a-zA-Z0-9]$/.exec(username)) {
        response.json({result:'error', message:"Username must be between 2 and "+config.username_length+" alphanumeric" + " characters or hyphen (-)." + " Can not start or end with a hyphen."}).status(400).pipe(res)
        return;
    }
    if (/--/.exec(username)) {
        response.json({result:'error',message:"Username cannot contain two consecutive hyphens."}).status(400).pipe(res)
        return;
    }

    if (config.reserved[normalized_username]) {
        response.json({result:'error',message:"This username is reserved for "+config.reserved[normalized_username]}).status(400).pipe(res)
        return;
    }

    var authSecret = req.body.auth_secret;
    authSecret = authSecret.toLowerCase();
    if (!/^[0-9a-f]{64}$/.exec(authSecret)) {
        response.json({result:'error',message:"Auth secret must be 32 bytes hex."}).status(400).pipe(res)
        return;
    }
    var q = new Queue;
    q.series([
    function(lib,id) {
        store.read({username:username},function(resp) {
            if (resp.exists === false) {
                lib.done();
            } else {
                response.json({result:'error',message:"User already exists"}).status(400).pipe(res)
                lib.terminate(id);
                return;
            }
       });
    },
    function(lib,id) {
        // check if account is funded
        var cb = function(isFunded) {
            if (isFunded == 'timeout') {
                lib.done();
                return
            }
            if (!isFunded) { 
                if (!count.check()) {
                    response.json({result:'error',message:"We have reached the daily signup limit. Please try again tomorrow."}).status(400).pipe(res)
                    lib.terminate(id);
                    return;
                } else {
                    // account is NOT funded but within the limit cap
                    reporter.log(req.body.address + " is not funded but within the limit cap");
                    lib.done();
                }
            } else {
                // mark as funded
                reporter.log("Marking as funded");
                lib.done({isFunded:true});
            }
        }
        count.checkLedger(req.body.address,protector(cb,5000,'timeout'))
    },
    function(lib) { 
        // TODO : inner key is required on updates

        var create_date = new Date();
        var create_timestamp = create_date.getTime();
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
            encrypted_secret:req.body.encrypted_secret,
            create_date : create_date,
            create_timestamp : create_timestamp,
            encrypted_blobdecrypt_key : req.body.encrypted_blobdecrypt_key,
            domain:domain
        };
        // if we reached here, we are either unfunded but within limit cap
        // or funded by the cutoff date
        store.create(params,function(resp) {
            if (resp.error) {
                response.json({result:'error',message:resp.error.message}).status(400).pipe(res)
                lib.done();
                return;
            }
            email.send({email:params.email,hostlink:params.hostlink,token:params.emailToken,name:username});
            response.json({result:'success'}).status(201).pipe(res)
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
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    } 
    // check patch size <= 1kb
    var size = libutils.atob(req.body.patch).length;
    if (size > config.patchsize*1024) {
        response.json({result:'error', message:'patch size > 1kb',size:size}).status(400).pipe(res)
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
                    reporter.log("Excceeded quota. row.quota = ",row.quota, " vs config.quota*1024 = ", config.quota*1024);
                    response.json({result:'error', message:'quota exceeded'}).status(400).pipe(res)
                    lib.terminate(id);
                    return;
                } else 
                    lib.done();
            } else if (resp.error) {
                response.json({result:'error', message:resp.error.message}).status(400).pipe(res)
                lib.terminate(id);
                return;
            } 
        })
    },
    function(lib,id) {
        // check valid base64
        if (!libutils.isBase64(req.body.patch)) {
            response.json({result:'error', message:'patch is not valid base64'}).status(400).pipe(res)
            lib.terminate(id);
            return
        }
        lib.done();
    },
    // update quota amount
    function(lib,id) {
        var newquota = size + lib.get('quota'); 
        store.update_where({
            set:{quota:newquota},
            where:{key:'id',value:req.body.blob_id}},
            function(resp) {
                if (resp.error) {
                    response.json({result:'error', message:resp.error.message}).status(400).pipe(res)
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
                reporter.log("quota:", row.quota);
            }
            lib.done();
        })
    },
*/
    function(lib) {
        store.blobPatch(size,req,res,function(resp) {
            response.json(resp).status(200).pipe(res)
            lib.done();
        });
    }
    ]); 
};
exports.consolidate = function (req, res) {
    var keyresp = libutils.hasKeys(req.body,['data','revision','blob_id']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return;
    }
    // check valid base64
    if (!libutils.isBase64(req.body.data)) {
        response.json({result:'error', message:'data is not valid base64'}).status(400).pipe(res)
        return
    }
/*
    var q = new Queue;
    q.series([
        function(lib,id) {
            store.read_where({key:'id', value:req.body.blob_id},function(resp) {
                if (resp.length) {
                    var row = resp[0];
                    reporter.log("OLD REVISION: ", row);
                    reporter.log("Attempted revision", req.body.revision);
                }
                lib.done();
            });
        }
    ]);
*/
    var size = libutils.atob(req.body.data).length;
    // checking quota
    if (size > config.quota*1024) {
        response.json({result:'error', message:'data too large',size:size}).status(400).pipe(res)
        return
    }

    // quota is updated in consolidate

    store.blobConsolidate({revision:req.body.revision,blob_id:req.body.blob_id,data:req.body.data},function(resp) {
        response.json(resp).pipe(res)
    });    
};
exports.delete = function (req, res) {
    var keyresp = libutils.hasKeys(req.query,['signature_blob_id']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
    } else 
        store.blobDelete(req,res,function(resp) {
            response.json(resp).pipe(res)
        });
};
exports.get = function (req, res) {
    var keyresp = libutils.hasKeys(req.params,['blob_id']);
    var blob_id = req.params.blob_id;
    var device_id = req.query.device_id;
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
    } else {
        var q = new Queue;
        q.series([
            function(lib) {
                store.blobGet({blob_id:blob_id},function(resp) {
                    if (!resp.error) {
                        lib.set({blobget:resp})
                        lib.done()
                    } else {
                        response.json(resp.error).status(404).pipe(res)
                        lib.terminate()
                    }
                });
            },
            function(lib) {
                store.read_where({key:'id',value:blob_id},function(resp) {
                    if (resp.length) {
                        lib.set({"_blob":resp[0]})
                    }
                    lib.done()
                })
            },
            function(lib) {
                var _blob = lib.get('_blob');
                var twofactor = {};
                if (_blob["2fa_enabled"] === true) {
                    if (device_id !== undefined) {
                        store.read_where({table:'twofactor',key:'device_id',value:device_id},
                        function(resp2) {
                            if (resp2.length) {
                                var row = resp2[0];
                                twofactor.is_auth = row.is_auth;
                                twofactor.device_id = row.device_id;
                                twofactor.enabled = _blob["2fa_enabled"];
                                twofactor.remember_me = _blob["2fa_remember_me"];
                                twofactor.via = _blob["2fa_via"];
                                twofactor.masked_phone = libutils.maskphone(_blob["2fa_phone"])
                                lib.set({twofactor:twofactor})
                                if (row.is_auth) {
                                    lib.done()
                                    return
                                } else {
                                    // send via, masked phone, 
                                    console.log("no authorization")
                                    response.json({result:'error',twofactor:{via:_blob["2fa_via"], masked_phone:libutils.maskphone(_blob["2fa_phone"])},message:'Two factor auth enabled but device is not authorized'}).status(404).pipe(res)
                                    lib.terminate()
                                    return
                                }
                            } else {
                                console.log("no record in twofactor")
                                response.json({result:'error',twofactor:{via:_blob["2fa_via"], masked_phone:libutils.maskphone(_blob["2fa_phone"])},message:'Two factor auth enabled but no auth result for that device id'}).status(404).pipe(res)
                                lib.terminate()
                                return
                            }
                            lib.done()
                        })
                    } else {
                        console.log("no device id sent")
                        response.json({result:'error',twofactor:{via:_blob["2fa_via"], masked_phone:libutils.maskphone(_blob["2fa_phone"])},message:'Two factor auth required. No device id supplied'}).status(404).pipe(res)
                        lib.terminate()
                        return
                    }
                } else {
                    console.log("2FA not enabled")
                    lib.done()
                }
            },
            function(lib) {
                store.identifyMissingFields({blob_id:blob_id},function(resp) {
                    lib.set({missingfields:resp})
                    lib.done()
                });
            },
            function(lib) {
                var obj = lib.get('blobget')
                obj.missing_fields = lib.get('missingfields');
                var tf = lib.get('twofactor')
                if (tf && obj["2fa_enabled"])
                    obj.twofactor = tf;
                response.json(obj).pipe(res)
                lib.done()
            }

        ])
    }
};

exports.getPatch = function (req, res) {
    var keyresp = libutils.hasKeys(req.params,['blob_id','patch_id']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
    } else 
    store.blobGetPatch(req,res,function(resp) {
        response.json(resp).pipe(res)
    });
};
