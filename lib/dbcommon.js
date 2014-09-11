var reporter = require('./reporter')
var config = require('../config');
var libutils = require('./utils');
var dbcommon = function(db) {
    var self = {};
    var create = function(params,cb) {
        reporter.log("dbcommon: create: username ", params.username)
        var blobId = params.blobId;
        var username = params.username;
        var normalized_username = libutils.normalizeUsername(username);
        var address = params.address;
        var authSecret = params.authSecret;
        var hostlink = params.hostlink;
        var encrypted_secret = params.encrypted_secret;
        var create_timestamp = params.create_timestamp;
        var create_date = params.create_date;
        var encrypted_blobdecrypt_key = params.encrypted_blobdecrypt_key;
        var domain = params.domain;

        // email related
        var emailVerified = params.emailVerified;
        var email = params.email;
        var emailToken = params.emailToken;
        
        if (emailVerified === false)
            emailVerified = 0;
        else 
            emailVerified = 1;
            
        // Convert blob from base64 to binary
        var data = new Buffer(params.data, 'base64');
        var data_size = params.data_size;
        var identity_id = libutils.generateIdentityId()
        db('blob')
        .insert({
            id: blobId, 
            username: username, 
            normalized_username:normalized_username,
            revision: 0,
            address: address, 
            auth_secret : authSecret,
            data: data, 
            quota:data_size,
            email_verified : emailVerified,
            email: email, 
            email_token : emailToken,
            hostlink : hostlink,
            encrypted_secret: encrypted_secret,
            create_date : create_date,
            create_timestamp : create_timestamp,
            encrypted_blobdecrypt_key : encrypted_blobdecrypt_key,
            domain: domain,
            identity_id : identity_id
        })
        .nodeify(function(err, resp) {
            if (err) {
                reporter.log("dbcommon:create:error",err)
                cb({error:new Error("Database create error")});
            } else {
                reporter.log("dbcommon: create success for ", username)
                cb({result:'success',identity_id:identity_id});
            }
        })
    }
    self.create = create;
    var readall = function(params,cb) {
        var username = params.username;
        var operator = (config.dbtype == 'postgres') ? 'ILIKE' : 'LIKE'
        db('blob')
        .where('username',operator,username)
        .select()
        .nodeify(function(err, resp) {
            if (err) {
                cb(err)
            } else {
                cb(resp)
            }
        })
    }
    self.readall = readall;
    var read = function(params, cb) {
        var username = params.username;
        var normalized_username = libutils.normalizeUsername(username);
        var res = params.res;
        var operator = (config.dbtype == 'postgres') ? 'ILIKE' : 'LIKE'
        db('blob')
        .where('normalized_username',operator,normalized_username)
        .select()
        .nodeify(function(err, resp) {
            if (err) {
                // this is a uncaught error , we dont pass the actual stacktrace
                reporter.log("read error:",err);
                cb({error:new Error("Database read error")});
            } else {
                var rows = resp;
                var response = {
                    username: username,
                    version: config.AUTHINFO_VERSION,
                    blobvault: config.url,
                    pakdf: config.defaultPakdfSetting
                };
                if (rows.length) {
                    var row = rows[0];
                    response.emailVerified = row.email_verified;
                    response.email = row.email;
                    response.emailToken= row.email_token;
                    response.username = row.username;
                    response.address = row.address;
                    response.exists = true;
                } else if (config.reserved[libutils.normalizeUsername(username)]) {
                    response.exists = false;
                    response.reserved = config.reserved[libutils.normalizeUsername(username)]
                } else {
                    response.exists = false;
                    response.reserved = false;
                }
                cb(response);
            }
        })
    };
    self.read = read;

    // updates the blob
    var update = function(params,cb) {
        var username = params.username;
        var normalized_username = libutils.normalizeUsername(username);
        var hash = params.hash;
        var operator = (config.dbtype == 'postgres') ? 'ILIKE' : 'LIKE'
        db('blob')
        .where('normalized_username',operator,normalized_username)
        .update(hash)
        .nodeify(function(err, resp) {
            if (err) {
                cb({error:new Error("Database update error")}); 
            } else {
                cb({result:'success'});
            }
        })
    }
    self.update = update;


    // updates the blob {set: {key1:value1,key2:value2,..}, where:{key:<key>,value:<value>}}
    var update_where = function(params,cb) {
        var where = params.where;
        var set = params.set;
        var table = params.table || 'blob';
        db(table)
        .where(where.key,'=',where.value)
        .update(set)
        .nodeify(function(err, resp) {  
            if (err) {
                reporter.log("dbcommon:update_where:error",err)
                cb({error:new Error("Database update error")}); 
            } else {
                cb({result:'success'});
            }
        })
    }
    self.update_where = update_where;

    var delete_where = function(params, cb) {
        var where = params.where;
        var table = params.table || 'blob';
        db(table)
        .where(where.key,'=',where.value)
        .del()
        .nodeify(function(err,resp) {
            if (err) {
                cb(err)
            } else
                cb(resp)
        })
    }
    self.delete_where = delete_where;

    // insert

    var insert = function(params,cb) {
        var set = params.set;
        var table = params.table || 'blob';
        db(table)
        .insert(set)
        .nodeify(function(err, resp) {
            if (err) {
                reporter.log("dbcommon:insert:error",obj)
                cb({error:new Error("Database insert error")}); 
            } else {
                cb({result:'success'});
            }
        })
    }
    self.insert = insert;

    // insert_or_update_where

    var insert_or_update_where = function(params,cb) {
        var where = params.where;
        var set = params.set;
        var table = params.table || 'blob';
        if (where !== undefined) 
            db(table)
            .where(where.key,'=',where.value)
            .update(set)
            .then(function(resp) {
                if (resp) {
                    cb({result:'success'});
                } else {
                    console.log("attempting to insert set", set)
                    db(table)
                    .insert(set)
                    .then(function() {
                        cb({result:'success'});
                    })                 
                }
            })
        else 
            db(table)
            .insert(set)
            .nodeify(function(err, resp) {
                if (err) {
                    reporter.log("dbcommon:insert_or_update_where:error",err)
                    cb({error:new Error("Database insert_or_update error")}); 
                } else {
                    cb({result:'success'});
                }
            })
    }
    self.insert_or_update_where = insert_or_update_where;

    // readwhere returns record at where key = value 
    var read_where = function(params, cb) {
        var table = params.table || 'blob';
        var key = params.key;
        var value = params.value;
        db(table)
        .where(key,'=',value)
        .select()
        .nodeify(function(err, resp) {
            if (err) {
                reporter.log("READ WHEREOBJ:",err);
                // obj is the real error, but we mask it 
                cb({error:new Error("Database read where error")}); 
            } else {
                cb(resp)
            }
        })
    };
    self.read_where = read_where;
    
    self.getAttestations = function (params, cb) {
      list = [];
      for (key in params) {
        list.push({key:key,value:params[key]});  
      }
      
      list.reduce(function(knex, pair) { 
          return knex.andWhere(pair.key, pair.value); }, db('attestations'))
      .select()
      .nodeify(function(err, resp) {
              if (err) {
                  cb({error:new Error('Attestation DB error')});
              } else {
                  cb(resp);
              }
          });          
    };
   
    self.getPhoneAttestation = function (identity_id, phone, cb) {
      db('attestations')
      .andWhere('identity_id', identity_id)
      .andWhere('type', 'phone')
      .whereRaw("payload->>'phone_number' = ?", [phone])
      .select()
      .nodeify(function(err, resp) {
        if (err) {
          cb({error:new Error('Attestation DB error')});
        } else {
          cb(resp);
        }
      });   
    };
    
    self.blobPatch = function(size,req,res,cb) {
        db('blob')
        .where('id','=',req.body.blob_id)
        .select('id','revision')
        .nodeify(function(err, resp) {
            if (err) {
                cb({error:new Error("Database blob patch error")}); 
            } else {
                var rows = resp;
                if (rows.length) {
                    var blob = rows[0];
                    return db('blob_patches')
                    .where('blob_id','=',req.body.blob_id)
                    .select('revision')
                    .orderBy('revision','DESC')
                    .limit(1)
                    .then(function(rows) {
                        // XXX Race condition: another revision might get added at same time
                        var lastRevision = +(rows.length ? rows[0].revision : blob.revision);
                        var patch = new Buffer(req.body.patch, 'base64');
                        return db('blob_patches')
                        .insert({
                            blob_id:req.query.signature_blob_id,
                            revision: lastRevision+1,
                            size:size,
                            data: patch
                        })
                        .then(function() {
                            cb({
                                result: 'success',
                                revision: lastRevision + 1
                            });
                        });
                    })
                } else {
                    cb({error:new Error("Database blob patch error")}); 
                }
            }
        })
    };
    self.blobConsolidate = function(params,cb) {

        var data = new Buffer(params.data, 'base64');
        // totalsize is the amount of bytes deleted so we can adjust the quota
        var totalsize = 0;

        db.transaction(function(t) {
            db('blob')
            .transacting(t)
            .where('id','=',params.blob_id)
            .update({data:data, revision:params.revision})
            .then(function() {
                return db('blob_patches')
                .where('blob_id','=',params.blob_id).andWhere('revision','<=', params.revision)
                .sum('size')
                .then(function(rows) {
                    if (rows.length) {
                        totalsize = rows[0].sum;
                        // adjust quota
                        if (totalsize > 0) {
                            db('blob')
                                .where('id','=',params.blob_id)
                                .select('quota')
                                .then(function(rows) {
                                    if (rows.length) {
                                        var row = rows[0]; 
                                        var quota = row.quota;
                                        var newquota = quota - totalsize;
                                        return db('blob')
                                            .where('id','=',params.blob_id)
                                            .update({quota:newquota})
                                            .then();
                                    }
                                })
                        }
                    }
                    return db('blob_patches')
                    .where('blob_id','=',params.blob_id).andWhere('revision','<=', params.revision)
                    .del()
                    .then(t.commit)
                })
             })
            .catch(function(obj) {
                reporter.log(obj);
                t.rollback()
                // obj is the real error, but we mask it 
                cb({error:new Error("Database patch consolidate error")}); 
            })
        })
        .then(function() {
            reporter.log('Blob Consolidated!');
            cb({result:'success'});
        })
    }


    self.blobDelete = function(params,cb) {
        db.transaction(function(t) {
           return db('blob')
            .transacting(t)
            .where('id','=',params.blob_id)
            .del()
            .then(function() {
                return db('blob_patches')
                .where('blob_id','=',params.blob_id)
                .del()
            })
/*
// no longer necessary per https://github.com/tgriesser/knex/issues/362
            .then(function(resp) {
                t.commit()
            })
            .catch(function(e) {
                t.rollback();
                throw e;
            })
*/
        })
        .catch(function(e) {
            reporter.log("blobDelete: error:", e)
            cb({error:new Error("Database blob delete error")}); 
        })
        .then(function() {
            reporter.log("blobDelete: transaction completed on ", params)
            cb({result:'success'})
        })
    }
    self.blobGet = function(params,cb) {
        db('blob')
        .where('id','=',params.blob_id)
        .select('data','revision','email','encrypted_secret','quota','identity_id')
        .nodeify(function(err, resp) {
            if (err) {
                console.log("blobGet error:", err)
                // obj is the real error, but we mask it 
                cb({error:new Error("Database blob get error")}); 
            } else {
                var rows = resp;
                if (rows.length) {
                    var blob = rows[0];
                    db('blob_patches')
                    .where('blob_id','=',params.blob_id)
                    .orderBy('revision','ASC')
                    .select('data')
                    .nodeify(function(err, resp) {
                        var rows = resp; 
                        cb({
                            result: 'success',
                            encrypted_secret : blob.encrypted_secret.toString('base64'),
                            blob : blob.data.toString('base64'),
                            revision : blob.revision,
                            email: blob.email,
                            quota: blob.quota,
                            patches: rows.map(function (patch) {return patch.data.toString('base64');}),
                            identity_id: blob.identity_id
                        });
                    })
                } else {
                    cb({error:new Error("Database blob get error")}); 
                }
            }
        })
    };
    self.identifyMissingFields = function(params,cb) {
        db('blob')
        .where('id','=',params.blob_id)
        .select()
        .nodeify(function(err, resp) {
            if (err) {
                cb({error:new Error("IdentifyMissingFields error")}); 
            } else {
                var obj = {};
                var row = resp[0];
                var keys = Object.keys(row);
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    if (row[key] === null) {
                        obj[key] = 'missing'
                    }
                }
                cb(obj)
            }
        })
    };
    self.blobGetPatch = function(req,res,cb) {
        db('blob_patches')
        .where('blob_id','=',req.params.blob_id).andWhere('revision','=',req.params.patch_id)
        .select('data')
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database get patch error")}); 
        })
        .then(function(rows) {
            if (rows.length)
                cb({
                    result: 'success',
                    patch: rows[0].data.toString('base64')
                });
            else
                cb({error:new Error("Database get patch error")}); 
        })
    };

    self.hmac_getSecret = function(params, cb) {
        var blobId = params.blobId;
        var res = params.res;
        db('blob')
        .where('id','=',blobId)
        .select('auth_secret')
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            reporter.log(obj);
            cb({error:new Error("Database hmac get secret error")}); 
        })
        .then(function(rows) {
            if (!rows.length) {
            throw new Error("Invalid blobId");
            return;
            }
            cb(null, rows[0].auth_secret);
        })
    };
    self.checkLocked = function(address,cb) {
        db('campaigns')
        .where('address','=',address)
        .select()
        .then(cb);
    }
    self.batchlookup = function(params,cb) {
        var list = params.list;
        var key = params.key || 'address'
        var table = params.table || 'blob';
        console.log(list);
        list
            .reduce(function(knex, value) { 
                return knex.orWhere(key, '=', value); }, db(table))
            .select()
            .nodeify(function(err, resp) {
                if (err) {
                    cb({error:'batch lookup error'})
                } else {
                    cb(resp)
                }
            })
    }
    return self;
}
module.exports = exports = dbcommon;
