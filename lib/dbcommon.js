var config = require('../config');
var dbcommon = function(db) {
    var self = {};
    var create = function(params,cb) {
        var blobId = params.blobId;
        var username = params.username;
        var address = params.address;
        var authSecret = params.authSecret;
        var hostlink = params.hostlink;
        var encrypted_secret = params.encrypted_secret;

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
        db('blob')
        .insert({
            id: blobId, 
            username: username, 
            revision: 0,
            address: address, 
            auth_secret : authSecret,
            data: data, 
            email_verified : emailVerified,
            email: email, 
            email_token : emailToken,
            hostlink : hostlink,
            encrypted_secret: encrypted_secret
        })
        .then(function(resp) {
            cb({result:'success'});
        })
        .catch(function(e) {
            // we mask the actual error ,e
            cb({error:new Error("Database create error")});
        });
    }
    self.create = create;
    var readall = function(params,cb) {
        var username = params.username;
        db('blob')
        .where('username','ILIKE',username)
        .select()
        .then(function(rows) {
            cb(rows);
        })
        .catch(cb)
    }
    self.readall = readall;
    var read = function(params, cb) {
        var username = params.username;
        var res = params.res;
        db('blob')
        .where('username','ILIKE',username)
        .select()
        .then(function(rows) {
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
            } else if (config.reserved[username.toLowerCase()]) {
                response.exists = false;
                response.reserved = config.reserved[username.toLowerCase()];
            } else {
                response.exists = false;
                response.reserved = false;
            }
            cb(response);
        })
        .catch(function(obj) {
            // this is a uncaught error , we dont pass the actual stacktrace
            cb({error:new Error("Database read error")});
        })
    };
    self.read = read;

    // updates the blob
    var update = function(params,cb) {
        var username = params.username;
        var hash = params.hash;

        db('blob')
        .where('username','ILIKE',username)
        .update(hash)
        .then(function(rows) {
            cb({result:'success'});
        })
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database update error")}); 
        })
    }
    self.update = update;


    // updates the blob {set: {key:<key>,value:<value>}, where:{key:<key>,value:<value>}}
    var update_where = function(params,cb) {
        var where = params.where;
        var set = params.set;
        var hash = {};
        hash[set.key] = set.value;
        
        db('blob')
        .where(where.key,'=',where.value)
        .update(hash)
        .then(function(rows) {
            cb({result:'success'});
        })
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database update error")}); 
        })
    }
    self.update_where = update_where;


    // readwhere returns record at where key = value 
    var read_where = function(params, cb) {
        var key = params.key;
        var value = params.value;
        db('blob')
        .where(key,'=',value)
        .select()
        .then(cb)
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database read where error")}); 
        })
    };
    self.read_where = read_where;
    self.blobPatch = function(size,req,res,cb) {
        db('blob')
        .where('id','=',req.body.blob_id)
        .select('id','revision')
        .then(function(rows) {
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
                    data: patch
                })
                .then(function() {
                    cb({
                        result: 'success',
                        revision: lastRevision + 1
                    });
                });
            })
        })
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database blob patch error")}); 
        })
    };
    self.blobConsolidate = function(req,res,cb) {

        var data = new Buffer(req.body.data, 'base64');

        db.transaction(function(t) {
            db('blob')
            .transacting(t)
            .where('id','=',req.body.blob_id)
            .update({data:data, revision:req.body.revision})
            .then(function() {
                return db('blob_patches')
                .where('blob_id','=',req.body.blob_id).andWhere('revision','<=', req.body.revision)
                .del()
                .then(t.commit)
             })
            .catch(function(obj) {
                t.rollback()
                // obj is the real error, but we mask it 
                cb({error:new Error("Database patch consolidate error")}); 
            })
        })
        .then(function() {
            console.log('Blob Consolitdated!');
            cb({result:'success'});
        })
    }


    self.blobDelete = function(req,res,cb) {
        db.transaction(function(t) {
            db('blob')
            .transacting(t)
            .where('id','=',req.query.signature_blob_id)
            .del()
            .then(function(resp) {
                return db('blob_patches')
                .where('blob_id','=',req.query.signature_blob_id)
                .del()
                .then(function() {
                    cb({result:"success"});
                    t.commit();
                });
            })
            .catch(function(obj) {
                t.rollback();
                // obj is the real error, but we mask it 
                cb({error:new Error("Database blob delete error")}); 
            })
        })
    }
    self.blobGet = function(req,res,cb) {
        db('blob')
        .where('id','=',req.params.blob_id)
        .select('data','revision','email','encrypted_secret')
        .then(function(rows) {
            var blob = rows[0];
            return db('blob_patches')
            .where('blob_id','=',req.params.blob_id)
            .orderBy('revision','ASC')
            .select('data')
            .then(function(rows) {
                return cb({
                    result: 'success',
                    encrypted_secret : blob.encrypted_secret,
                    blob : blob.data.toString('base64'),
                    revision : blob.revision,
                    email: blob.email,
                    patches: rows.map(function (patch) {return patch.data.toString('base64');})
                });
            })
        })
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database blob get error")}); 
        })
    };
    self.blobGetPatch = function(req,res,cb) {
        db('blob_patches')
        .where('blob_id','=',req.params.blob_id).andWhere('revision','=',req.params.patch_id)
        .select('data')
        .then(function(rows) {
            cb({
                result: 'success',
                patch: rows[0].data.toString('base64')
            });
        })
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database get patch error")}); 
        })
    };

    self.hmac_getSecret = function(params, callback) {
        var blobId = params.blobId;
        var res = params.res;
        db('blob')
        .where('id','=',blobId)
        .select('auth_secret')
        .then(function(rows) {
            if (!rows.length) {
            throw new Error("Invalid blobId");
            return;
            }
            callback(null, rows[0].auth_secret);
        })
        .catch(function(obj) {
            // obj is the real error, but we mask it 
            cb({error:new Error("Database hmac get secret error")}); 
        })
    };
    return self;
}
module.exports = exports = dbcommon;
