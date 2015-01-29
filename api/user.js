var reporter = require('../lib/reporter');
var qs = require('querystring')
var config = require('../config');
var request = require('request');
var response = require('response');
var libutils = require('../lib/utils');
var email = require('../lib/email');
var Queue = require('queuelib')

exports.store;
exports.setStore = function(s) {
    exports.store = s;
    reporter.store = s;
}
var getUserInfo = function(username, res) {
    if ("string" !== typeof username) {
        response.json({result:'error',message:'Username is required'}).status(400).pipe(res)
        return;
    }
    if (username.indexOf('~') === 0) {
        username = username.slice(1);
    }
    var normalized_username = libutils.normalizeUsername(username);

    var q = new Queue;
    q.series([
        function (lib) {
            if (username.length <= config.username_length) {
                exports.store.read({username:username,res:res},function(resp) {
                    var obj = {}
                    obj.version = config.AUTHINFO_VERSION;
                    obj.blobvault = config.url;
                    obj.pakdf = config.defaultPakdfSetting;

                    obj.exists = resp.exists;
                    obj.username = resp.username;
                    obj.address = resp.address;
                    obj.emailVerified = resp.emailVerified;
                    obj.reserved = config.reserved[normalized_username] || false;

                    lib.set({user:obj, identity_id:resp.identity_id});
                    lib.done();
                });

            } else {
                exports.store.read_where({key:"address",value:username,res:res},
                    function(resp) {
                        if (resp.error) {
                            response.json({code:7498,result:'error',message:resp.error.message}).status(400).pipe(res)
                            return;
                        }
                        var obj = {}
                        obj.version = config.AUTHINFO_VERSION,
                        obj.blobvault = config.url,
                        obj.pakdf = config.defaultPakdfSetting
                        if (resp.length) {
                            var row = resp[0];
                            obj.exists = true;
                            obj.username = row.username;
                            obj.address = row.address;
                            obj.emailVerified = row.email_verified;
                            obj.recoverable = row.encrypted_blobdecrypt_key ? true : false;
                            lib.set({user:obj, identity_id:row.identity_id});
                            lib.done();
                        } else {
                            obj.exists = false;
                            obj.reserved = false;
                            response.json(obj).pipe(res);
                            lib.terminate();
                        }
                    }
                )
            }
        },

        function (lib) {
          var id   = lib.get('identity_id');
          var user = lib.get('user');

          response.json(user).pipe(res);
          lib.done();
        }
    ]);
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
        response.json({result:'error',code:7477,message:'Username is required'}).status(400).pipe(res)
        return;
    }
    if ("string" !== typeof token) {
        response.json({result:'error', code:9106,message:'Token is required'}).status(400).pipe(res)
        return;
    }
    exports.store.read({username:username,res:res},function(resp) {
        if (resp.exists === false) {
            response.json({result:'error',code:5298,message:'No such user'}).status(404).pipe(res)
            return;
        } else {
            var obj = {}
            reporter.log("Token provided by user: ->"+ token + "<-");
            reporter.log("Token in database       ->"+ resp.emailToken + "<-");
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
                response.json({result:'error',code:5895,message:'Invalid token'}).status(400).pipe(res)
                return;
            }
        }
    });
}
var emailResend = function(req,res) {
  var keyresp = libutils.hasKeys(req.body,['email','hostlink']);
  var token   = libutils.generateToken();

  if (!keyresp.hasAllKeys) {
    response.json({
      result  : 'error',
      message : 'Missing keys',
      missing : keyresp.missing
    }).status(400).pipe(res)
    return;
  }

  if (!libutils.isValidEmail(req.body.email)) {
    response.json({
      result  : 'error',
      message : 'invalid email address'
    }).status(400).pipe(res)
    return;
  }

  //get the existing blob
  exports.store.db('blob')
  .where('id', req.query.signature_blob_id)
  .select('username','email','hostlink')
  .then(function(blobs) {
    if (!blobs.length) {
      response.json({result:'error',message:'invalid blob_id'}).status(400).pipe(res)
    } else {

      //save the email, hostlink, and new token
      exports.store.update_where({
        set:{
          email_verified : false,
          email          : req.body.email,
          hostlink       : req.body.hostlink,
          email_token    : token
        },
        where:{
          key   : 'id',
          value : req.query.signature_blob_id
        }
      },function(resp) {
        if ((resp.result) && (resp.result == 'success')) {
          email.send({
            email    : req.body.email,
            hostlink : req.body.hostlink,
            token    : token,
            name     : blobs[0].username
          });

          response.json({result:'success'}).pipe(res)
        } else {
          response.json({result:'error',message:'unspecified error'}).status(400).pipe(res)
        }
      });
    }
  });
}
/*
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
*/
var rename = function(req,res) {
    var keyresp = libutils.hasKeys(req.body,['username','blob_id','data','revision','encrypted_secret']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    keyresp = libutils.hasKeys(req.params,['username']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }

    if (!req.query.signature_blob_id) {
        response.json({result:'error', message:'Missing keys',missing:{signature_blob_id:true}}).status(400).pipe(res)
        return
    }

    var old_username = req.params.username;
    var old_blob_id  = req.query.signature_blob_id;
    var new_username = req.body.username;
    reporter.log("rename: from:", old_username, " to:" , new_username)
    var new_blob_id = req.body.blob_id;
    var encrypted_secret = req.body.encrypted_secret;
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
    // check availability
    function(lib,id) {
        exports.store.read_where({key:'username',value:new_username},
        function(resp) {
            if (resp.length === 0) {
                lib.done();
            } else {
                response.json({result:'error',message:"name not available"}).status(400).pipe(res)
                lib.terminate(id);
                return
            }
        })
    },
    // check for existance
    function(lib,id) {
        exports.store.read_where({key:'username',value:old_username},
        function(resp) {
            if (resp.length) {
                lib.set({email:resp[0].email})
                lib.done();
            } else {
                response.json({result:'error',message:"invalid user"}).status(400).pipe(res)
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
        // quota is updated in consolidate
        reporter.log('user: rename : blobConsolidate on old_blob_id:', lib.get('old_blob_id'))
        exports.store.blobConsolidate({
          blob_id  : req.query.signature_blob_id,
          revision : req.body.revision,
          data     : req.body.data
        },function(resp) {
            lib.done()
        });

    },
    function(lib) {
        var obj = {
          id : new_blob_id,
          encrypted_secret : encrypted_secret,
          username : new_username,
          normalized_username : new_normalized_username
        };

        if (req.body.encrypted_blobdecrypt_key) {
            obj.encrypted_blobdecrypt_key = req.body.encrypted_blobdecrypt_key;
        }

        exports.store.update_where({
          set   : obj,
          where : {
            key   : 'id',
            value : old_blob_id
          }
        }, function(resp) {
            var insertobj = {
                address : lib.get('address'),
                from_username : old_username,
                to_username : new_username,
                timestamp : new Date().getTime(),
                fulldate : new Date()
            }
            if (resp) {

                //NOTE: looks like name_change_history is not being updated
                reporter.log({table:'name_change_history',obj:insertobj});
                response.json({result:'success',message:'rename'}).pipe(res)
            } else
                response.json({result:'error',message:'rename'}).status(400).pipe(res)
            lib.done()
        })
    },
    function(lib) {
        // RT-2036 send email when user changes Ripple Name
        if (lib.get('email') !== undefined) {
            email.notifynamechange({email:lib.get('email'),new_username:new_username,old_username:old_username});
        }
        lib.done()
    },
    ])
}
var profiledetail = function(req,res) {
    var params = {};
    if (req.body.phone)
        params.phone = req.body.phone
    if (req.body.country)
        params.country = req.body.country
    if (req.body.region)
        params.region = req.body.region
    if (req.body.city)
        params.city = req.body.city
    for (key in params) {
        if (params[key].length > 100) {
            response.json({result:'error',message:'field too long'}).status(400).pipe(res)
            return
        }
    }
    var q = new Queue;
    q.series([
    // check for existance
    function(lib,id) {
        exports.store.read_where({key:'username',value:req.params.username},
        function(resp) {
            if (resp.length) {
                lib.done();
            } else {
                response.json({result:'error',message:"invalid user"}).status(400).pipe(res)
                lib.terminate(id);
                return
            }
        });
    },
    function(lib) {
    exports.store.update_where({set:params,where:{key:'username',value:req.params.username}},
        function(resp) {
            reporter.log("kyc: update:resp:",resp)
            if (resp) {
                response.json({result:'success'}).pipe(res)
            } else {
                response.json({result:'error',message:'update error'}).status(400).pipe(res)
            }
        })
    }
    ])
}

var phonerequest = function(req,res) {
    var keyresp = libutils.hasKeys(req.body,['via','phone_number','country_code']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
/*
    keyresp = libutils.hasKeys(req.params,['username']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
*/
    var produrl = config.phone.url+'/protected/json/phones/verification/start?api_key='+config.phone.key
    var obj = { via:req.body.via, phone_number:req.body.phone_number,country_code:req.body.country_code }
    request.post({url:produrl,json:true,body:qs.stringify(obj)},function(err,resp,body) {
        if (body.success === true) {
            response.json({result:'success'}).pipe(res)
        } else  {
            response.json({result:'error'}).status(400).pipe(res)
        }
    });
}
var phonevalidate = function(req,res) {
    var keyresp = libutils.hasKeys(req.body,['token','phone_number','country_code']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    var obj = {api_key:config.phone.key,phone_number:req.body.phone_number,country_code:req.body.country_code,verification_code:req.body.token}
    var produrl = config.phone.url+'/protected/json/phones/verification/check'
    request.get({url:produrl,qs:obj,json:true},function(err,resp,body) {
        if (body.success === true) {
            response.json({result:'success'}).pipe(res)
        } else  {
            response.json({result:'error'}).status(400).pipe(res)
        }
    })
}

var recover = function(req,res) {
    var obj = {}
    exports.store.read_where({key:'normalized_username',value:libutils.normalizeUsername(req.params.username)},function(resp) {
        if (resp.length) {
            var row = resp[0];
            obj.encrypted_secret = row.encrypted_secret.toString('base64')
            obj.revision = row.revision;
            obj.blob_id = row.id;
            obj.blob = row.data.toString('base64')
            obj.encrypted_blobdecrypt_key = row.encrypted_blobdecrypt_key;
        } else {
            response.json({result:'error', message:'invalid username'}).status(400).pipe(res)
            return;
        }
        exports.store.read_where({table:'blob_patches',key:'blob_id',value:obj.blob_id},function(resp) {
            obj.patches = resp.map(function(patch) { return patch.data.toString('base64') })
            obj.result = 'success';
            response.json(obj).pipe(res)
        })
    })
}
var updatekeys = function(req,res) {
    var keyresp = libutils.hasKeys(req.body,['blob_id','data','revision','encrypted_secret','encrypted_blobdecrypt_key']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    keyresp = libutils.hasKeys(req.params,['username']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    var username = req.params.username;
    var new_blob_id = req.body.blob_id;
    var encrypted_secret = req.body.encrypted_secret;

    var q = new Queue;
    q.series([
    // check for existance
    function(lib,id) {
        exports.store.read_where({key:'normalized_username',value:libutils.normalizeUsername(username)},function(resp) {
            if (resp.length) {
                lib.set({old_blob_id:resp[0].id})
                lib.set({_blob:resp[0]})
                lib.done();
            } else {
                response.json({result:'error',message:"invalid user"}).status(400).pipe(res)
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
        // quota is updated in consolidate
        reporter.log('user: updatekeys: blobConsolidate on old_blob_id:', lib.get('old_blob_id'))
        exports.store.blobConsolidate({blob_id:lib.get('old_blob_id'),revision:req.body.revision,data:req.body.data},function(resp) {
            lib.done()
        });

    },
    function(lib) {
        var obj = {id:new_blob_id,encrypted_secret:encrypted_secret,encrypted_blobdecrypt_key:req.body.encrypted_blobdecrypt_key}
        exports.store.update_where({set:obj,where:{key:'normalized_username',value:libutils.normalizeUsername(username)}},function(resp) {
            reporter.log("user: updatekeys : update response", resp)
            if (resp) {
                response.json({result:'success',message:'updatekeys'}).pipe(res)
            } else
                response.json({result:'error',message:'updatekeys'}).status(400).pipe(res)
            lib.done()
        })
    },
    function(lib) {
        var old_blob_id = lib.get('old_blob_id')
        var id = req.body.blob_id;
        if (old_blob_id != id) {
            var _blob = lib.get('_blob')
            email.notifypasswordchange({email:_blob.email,username:_blob.username});
            lib.done()
        } else {
            lib.done()
        }
    }
    ])
}

var set2fa = function(req,res) {
    reporter.log("\n**set2fa:body:",req.body)
    var keyresp = libutils.hasKeys(req.query,['signature_blob_id']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    var blob_id = req.query.signature_blob_id;
    var enabled = req.body.enabled;
    var phone   = req.body.phone;
    if (phone)
        phone = libutils.normalizePhone(phone)
    var country_code = req.body.country_code;

    var q = new Queue;

    q.series([
    function(lib) {
        exports.store.read_where({key:'id',value:blob_id},function(resp) {
            if (resp.length) {
                lib.set({_blob:resp[0]})
                lib.done()
            } else {
                response.json({result:'error',message:'error setting 2fa'}).status(400).pipe(res)
                lib.terminate();
                return;
            }
        })
    },
    function(lib) {
        var _blob = lib.get('_blob');
        if ((phone) && (phone != _blob['2fa_phone'])) {
            var obj = {phone_verified:false};
            obj['2fa_enabled'] = false;
            exports.store.update_where({set:obj,where:{key:'id',value:blob_id}},function(resp) {
                _blob.phone_verified = false;
                _blob['2fa_enabled'] = false;
                lib.set({_blob:_blob})
                reporter.log("new phone", phone, " does not equal 2fa_phone:", _blob['2fa_phone'], " on record, setting phone_verified false for ", _blob.username)
                lib.done()
            })
        } else {
            lib.done()
        }
    },
    function(lib) {
        // do not allow enabled 2fa if phone is not verified, RT-1945
        var _blob = lib.get('_blob');
        reporter.log("set2fa:check phone verified: blob:", _blob)
        if (!_blob.phone_verified) {
        // check if phone is different ... actually we will reset phone_verified on
            if (enabled === true) {
                response.json({result:'error',message:'enabled cannot be set if phone number is not verified'}).status(400).pipe(res)
                lib.terminate()
                return
            } else {
                lib.done()
            }
        } else
            lib.done()
    },
    function(lib) {
        // purpose of this block is to obtain an auth_id or update for a new auth_id
        // create the auth id if we don't have an auth_id OR we get a new auth_id if phone is different
        var _blob = lib.get('_blob')
        // we don't need to normalize the phone check since the saved phone is already normalized as is the phone from the request
        // this check is saying do they not have an auth id OR has the phone changed
        if ((!_blob["2fa_auth_id"]) || (phone && (phone != _blob['2fa_phone']))) {
            reporter.log("set2fa:auth id not set or we need a new one. getting auth id from provider")
            if (country_code && _blob.email && phone) {
                var produrl = config.phone.url+'/protected/json/users/new/?api_key='+config.phone.key
                var obj = { email:_blob.email, cellphone:phone,country_code:country_code }
                reporter.log("set2fa:storing the auth_id tied to:", qs.stringify(obj));
                reporter.log("set2fa:auth id going to register user");
                request.post({url:produrl,json:{user:obj}},function(err,resp,body) {
                    reporter.log("set2fa:auth id response body:",body);
                    if (body && body.user) {
                        var update_obj = {};
                        update_obj["2fa_auth_id"] = body.user.id;
                        exports.store.update_where({set:update_obj,where:{key:'id',value:blob_id}},function(resp) {
                            reporter.log("set2fa:2fa_auth_id:",body.user.id);
                            lib.done()
                        })
                    } else {
                        response.json({result:'error',message:'invalid phone'}).status(400).pipe(res)
                        lib.terminate()
                        return;
                    }
                })
            } else
                lib.done()
        } else {
            reporter.log("set2fa:auth id is set. not getting auth id from provider")
            lib.done()
        }
    },
    function(lib) {
        var obj = {}
        if (enabled !== undefined)
            obj["2fa_enabled"] = enabled;
        if (phone !== undefined) {
            obj['phone_verified'] = false;
            obj["2fa_phone"] = phone;
        }
        if (country_code !== undefined)
            obj["2fa_country_code"] = country_code;
        exports.store.update_where({set:obj,where:{key:'id',value:blob_id}},function(resp) {
            if (resp.result) {
                if (resp.result == 'success')
                    response.json({result:'success'}).pipe(res)
                else if (resp.result == 'error')
                    response.json({result:'error',message:'error setting 2fa'}).status(400).pipe(res)
                lib.done();
                return
            } else {
                response.json({result:'error',message:'error setting 2fa'}).status(400).pipe(res)
                lib.done()
            }
        })
    }]);
}
var get2fa = function(req,res) {
    reporter.log("get2fa")
    var keyresp = libutils.hasKeys(req.query,['signature_blob_id']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    var device_id = req.query.device_id || undefined;
    var blob_id = req.query.signature_blob_id;

    exports.store.read_where({key:'id',value:blob_id},function(resp) {
        var blobsettings = resp;
        if (device_id !== undefined) {
            exports.store.read_where({table:'twofactor',key:'device_id',value:device_id},
            function(resp) {
                var deviceidrow;
                if (resp.length) {
                    deviceidrow = resp[0]
                }
                if (blobsettings.length) {
                    var row = blobsettings[0]
                    var phone = row["2fa_phone"]
                    var masked_phone = libutils.maskphone(phone);

                    var obj = { auth_id:row["2fa_auth_id"],country_code:row["2fa_country_code"],enabled:row["2fa_enabled"],remember_me:row["2fa_remember_me"],phone:phone,masked_phone:masked_phone}
                    obj.result = 'success';
                    if (deviceidrow) {
                        obj.remember_me = deviceidrow.remember_me;
                        obj.device_id = deviceidrow.device_id;
                        obj.is_auth = deviceidrow.is_auth;
                    }
                    response.json(obj).pipe(res)
                } else {
                    response.json({result:'error',message:'error getting 2fa settings'}).status(400).pipe(res)
                }
            })
        } else {
            if (blobsettings.length) {
                var row = blobsettings[0]
                console.log("THE ROW:",row)
                var phone = row["2fa_phone"]
                var masked_phone = libutils.maskphone(phone);

                var obj = { auth_id:row["2fa_auth_id"],country_code:row["2fa_country_code"],enabled:row["2fa_enabled"],remember_me:row["2fa_remember_me"],phone:phone,masked_phone:masked_phone}
                obj.result = 'success';
                console.log("THE OBJ:",obj)
                response.json(obj).pipe(res)
            } else {
                response.json({result:'error',message:'error getting 2fa settings'}).status(400).pipe(res)
            }
        }
    })
}

var request2faToken = function(req,res) {
    var blob_id = req.params.blob_id;
    var force_sms = req.query.force_sms;
    var q = new Queue;

    q.series([
    function(lib) {
        exports.store.read_where({key:'id',value:blob_id},function(resp) {
            if (resp.length) {
                lib.set({_blob:resp[0]})
                lib.done()
            } else {
                response.json({result:'error',message:'error requesting 2fa token'}).status(400).pipe(res)
                lib.terminate();
                return;
            }
        })
    },
    function(lib) {
        // create the auth id
        var _blob = lib.get('_blob')
        if (!_blob["2fa_auth_id"]) {
            reporter.log("request2fa:auth id not set. getting auth id from provider")
            if (country_code && _blob.email && phone) {
                var produrl = config.phone.url+'/protected/json/users/new/?api_key='+config.phone.key
                var obj = { email:_blob.email, cellphone:phone,country_code:country_code }
                reporter.log("request2fa:storing the auth_id tied to:", qs.stringify(obj));
                reporter.log("request2fa:auth id going to register user");
                request.post({url:produrl,json:{user:obj}},function(err,resp,body) {
                    reporter.log("request2fa:auth id response body:",body);
                    if (body && body.user) {
                        var update_obj = {};
                        update_obj["2fa_auth_id"] = body.user.id;
                        exports.store.update_where({set:update_obj,where:{key:'id',value:blob_id}},function(resp) {
                            reporter.log("request2fa:2fa_auth_id:",body.user.id);
                            lib.done()
                        })
                    } else
                        lib.done()
                })
            } else
                lib.done()
        } else {
            reporter.log("set2fa:auth id is set. not getting auth id from provider")
            lib.done()
        }
    },
    function(lib) {
        var blob = lib.get('_blob');
        var country_code = blob["2fa_country_code"];
        var phone_number = blob["2fa_phone"];
        var auth_id = blob['2fa_auth_id'];

        if ((!phone_number) && (!country_code) && (!auth_id)) {
            response.json({result:'error',message:'error on request 2fa token'}).status(400).pipe(res)
            lib.terminate()
            return
        } else {
            var produrl = config.phone.url+'/protected/json/sms/'+auth_id+'?api_key='+config.phone.key
            if ((force_sms !== undefined) && (force_sms == 'true'))
                produrl = produrl.concat('&force=true')
            console.log("request2fa token:", produrl)
            request.get({url:produrl,json:true},function(err,resp,body) {
                reporter.log("request2fa token request body:",body)
                var obj = {};
                if (body.success === true)
                    obj.result = 'success';
                else
                    obj.result = 'error';
                if ((body.ignored !== undefined) && (body.ignored === true))
                    obj.via = 'app';
                else
                    obj.via = 'sms';
                if (body.success === true)
                    response.json(obj).pipe(res)
                else
                    response.json(obj).status(400).pipe(res)
                lib.done()
            });
        }
    }
    ]);
}

var verify2faToken = function(req,res) {
    var blob_id = req.params.blob_id;

    var keyresp = libutils.hasKeys(req.body,['device_id','token']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    var device_id = req.body.device_id;
    var token  = req.body.token;
    var remember_me = req.body.remember_me;
    reporter.log("verify2faToken:device_id:",device_id," token:",token," remember_me:",remember_me)
    var q = new Queue;
    q.series([
    function(lib) {
        if (remember_me !== undefined)
            exports.store.update_where({table:'twofactor',where:{key:'device_id',value:device_id},set:{remember_me:remember_me}},function(resp) {
                lib.done()
            })
        else
            lib.done()
    },
    function(lib) {
        // check if verification is unnecessary
        exports.store.read_where({table:'twofactor',key:'device_id',value:device_id},
        function(resp) {
            if (resp.length) {
                var row = resp[0];
                if (row.is_auth) {
                    reporter.log("verify2fa: already is_auth. no need to verify")
                    response.json({result:'success'}).pipe(res)
                    lib.terminate()
                } else
                    reporter.log("verify2fa: is NOT is_auth. contacting verification")
                    lib.done()
            } else
                lib.done()
        })
    },
    function(lib) {
        exports.store.read_where({key:'id',value:blob_id},function(resp) {
            if (resp.length) {
                var row = resp[0];
                var country_code = row["2fa_country_code"];
                var phone_number = row["2fa_phone"];
                var auth_id = row['2fa_auth_id'];
                if ((!phone_number) && (!country_code)) {
                    response.json({result:'error',message:'error on validate 2fa token'}).status(400).pipe(res)
                    lib.done()
                    return
                } else {
                    var obj = {api_key:config.phone.key,phone_number:phone_number,country_code:country_code,verification_code:token}
                    var produrl = config.phone.url+'/protected/json/verify/'+token+'/'+auth_id+'?api_key='+config.phone.key
                    request.get({url:produrl,json:true},function(err,resp,body) {
                        reporter.log("auth provider response on verify:",body)
                        if (body.success == 'true') {
                            var currtime = new Date().getTime()
                            exports.store.update_where({
                            where:{key:'id',value:blob_id},
                            set:{phone_verified:true}}, function(resp) {
                                exports.store.insert_or_update_where({table:'twofactor',where:{key:'device_id',value:device_id},set:{remember_me:remember_me,blob_id:blob_id,is_auth:true,device_id:device_id,last_auth_timestamp:new Date().getTime()}},
                                function(resp2) {
                                    reporter.log("verify2fa success:",resp2)
                                    response.json({result:'success'}).pipe(res)
                                    lib.done()
                                })
                            })
                        } else  {
                            exports.store.insert_or_update_where({table:'twofactor',where:{key:'device_id',value:device_id},set:{blob_id:blob_id,is_auth:false,remember_me:remember_me,device_id:device_id}},
                            function(resp2) {
                                reporter.log("verify2fa set incorrect code:",resp2)
                                response.json({result:'error',message:'invalid token'}).status(400).pipe(res)
                                lib.done()
                            });
                        }
                    })
                }
            } else  {
                response.json({result:'error',message:'error on validate 2fa token'}).status(400).pipe(res)
                lib.done()
            }
        });
    }
    ])
}

var batchlookup = function(req,res,next) {
    var keyresp = libutils.hasKeys(req.body,['list']);
    if (!keyresp.hasAllKeys) {
        response.json({result:'error', message:'Missing keys',missing:keyresp.missing}).status(400).pipe(res)
        return
    }
    var list = req.body.list;
    exports.store.batchlookup({list:list},function(resp) {
        if (resp.error) {
            response.json({result:'error',message:resp.error}).status(400).pipe(res);
            return
        } else {
            var result_hash = {};
            for (var i = 0; i < resp.length; i++) {
                var addr = resp[i].address;
                var username = resp[i].username;
                result_hash[addr] = username;
            }
            response.json({result:'success',mapping:result_hash}).pipe(res)
        }
    })
}

exports.batchlookup = batchlookup;
exports.request2faToken = request2faToken;
exports.verify2faToken = verify2faToken;
exports.set2fa = set2fa;
exports.get2fa = get2fa;
exports.recover = recover;
exports.phoneRequest = phonerequest;
exports.phoneValidate = phonevalidate;
exports.profile = profiledetail;
exports.emailResend = emailResend;
exports.get = get;
exports.verify = verify;
exports.authinfo = authinfo;
exports.rename = rename
exports.updatekeys = updatekeys;
