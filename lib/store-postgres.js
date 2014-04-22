var db = require('./db-postgres').connection;
var config = require('../config');
var Hash = require('hashish');

var handleError = function(obj) {
    console.log("API Error");
    if (obj.res) {
        if (obj.error !== undefined) {
            obj.res.writeHead(obj.statusCode || 400, {
                'Content-Type' : 'application/json',
                'Access-Control-Allow-Origin': '*' 
            })
            obj.res.end(JSON.stringify({result:'error',message:obj.error.message}));
        }
    }
}

var create = function(params,cb) {

    var blobId = params.blobId;
    var username = params.username;
    var address = params.address;
    var authSecret = params.authSecret;
    var hostlink = params.hostlink;

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
        hostlink : hostlink
    })
    .then(function(resp) {
        cb({result:'success'});
    })
    .catch(function(obj) {
        if (obj.res === undefined) {
        // this is a uncaught error
            cb({error:new Error("Database create error")});
            //handleError(obj);
        } else
        cb(obj);
    });
}
exports.create = create;
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
exports.readall = readall;
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
        if (obj.res === undefined) {
        // this is a uncaught error , we dont pass the actual stacktrace
        // which is obj 
            cb({error:new Error("Database read error")});
        } else
        cb(obj);
    })
};
exports.read = read;

// params.hash = { key : value ,  key2 : value2 }  
// updates the blob
var update = function(params,cb) {
    var username = params.username;
    var hash = params.hash;

    db('blob')
    .where('username','ILIKE',username)
    .update(hash)
    .exec(function(err,resp) {
        if (err == null)
            cb({result:'success'});
        else {
            process.nextTick(function() {
                throw { error : new Error("Error in updating postgres"), res : params.res}
            });
        }
    });
}
exports.update = update;

// readwhere finds all username and record that has the associated key /value pair
var read_where = function(params, cb) {
    var key = params.key;
    var value = params.value;
    db('blob')
    .where(key,'=',value)
    .select()
    .then(function(rows) {
        var response = {};
        if (rows.length) {
            var row = rows[0];
// Wrong
            response.username = row.username;
            response.emailVerified= row.email_verified;
            response.emailToken= row.email_token;
            response.email = row.email;
            response.address = row.address;
            response.exists = true;
        } else 
            response.exists = false;
        cb(response);
    })
    .catch(function(obj) {
        if (obj.res === undefined) {
        // this is a uncaught error
            cb({error:new Error("Database read where error")}); 
        } else
        handleError(obj);
    })
};
exports.read_where = read_where;
exports.blobPatch = function(req,res,cb) {
    // XXX Check HMAC
    // XXX Check patch size , 2kb
    // XXX Check quota, 1000kb
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
            // XXX Handle invalid base64
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
        if (obj.res === undefined) {
        // this is a uncaught error , we dont pass the actual stacktrace
        // which is obj 
            cb({error:new Error("Database patch error")});
        } else 
        cb(obj);
    })
};
exports.blobConsolidate = function(req,res,cb) {
    // XXX Check blob exists

    // XXX Check HMAC

    // XXX Check quota

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
            if (obj.res === undefined) {
            // this is a uncaught error
                handleError({error:new Error("Database error"),res:res}); 
//              handleError({error:obj,res:res}); 
            } else
            handleError(obj);
        })
    })
    .then(function() {
        console.log('Blob Consolitdated!');
        cb({result:'success'});
    })
}


exports.blobDelete = function(req,res,cb) {
    // XXX Check blob exists

    // XXX Check HMAC
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
            if (obj.res === undefined) {
            // this is a uncaught error
                handleError({error:new Error("Database error"),res:res}); 
            //    handleError({error:obj,res:res}); 
            } else
            handleError(obj);
            t.rollback();
        })
    })
}
exports.blobGet = function(req,res,cb) {
    // XXX Check blob exists

    // XXX Check HMAC
    db('blob')
    .where('id','=',req.params.blob_id)
    .select('data','revision','email')
    .then(function(rows) {
        var blob = rows[0];
        return db('blob_patches')
        .where('blob_id','=',req.params.blob_id)
        .orderBy('revision','ASC')
        .select('data')
        .then(function(rows) {
            return cb({
                result: 'success',
                blob: blob.data.toString('base64'),
                revision: blob.revision,
                email: blob.email,
                patches: rows.map(function (patch) {return patch.data.toString('base64');})
            });
        })
    })
    .catch(function(obj) {
        if (obj.res === undefined) {
        // this is a uncaught error
            handleError({error:new Error("Database error"),res:res}); 
            //handleError({error:obj,res:res}); 
        } else
        handleError(obj);
    })
};
exports.blobGetPatch = function(req,res,cb) {
    // XXX Check blob exists
    // XXX Check HMAC
    db('blob_patches')
    .where('blob_id','=',req.params.blob_id).andWhere('revision','=',req.params.patch_id)
    .select('data')
    .then(function(rows) {
        cb({
            result: 'success',
            patch: rows[0].data // XXX Convert to base64
        });
    })
    .catch(function(obj) {
        if (obj.res === undefined) {
        // this is a uncaught error
            handleError({error:new Error("Database error"),res:res}); 
            //handleError({error:obj,res:res}); 
        } else 
        handleError(obj);
    })
};

exports.hmac_getSecret = function(params, callback) {
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
        if (obj.res === undefined) {
        // this is a uncaught error
            handleError({error:new Error("hmac error"),res:res}); 
            //handleError({error:obj,res:res}); 
        } else 
        handleError(obj);
    })
};
