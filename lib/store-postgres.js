var db = require('./db-postgres').connection;
var config = require('../config');
var Hash = require('hashish');
var create = function(params,cb) {

    var blobId = params.blobId;
    var username = params.username;
    var address = params.address;
    var authSecret = params.authSecret;

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
        address: address, 
        auth_secret : authSecret,
        data: data, 
        email_verified : emailVerified,
        email: email, 
        email_token : emailToken
    })
    .exec(function(err,resp) {
        if (err) {
            process.nextTick(function() {
                throw { error : err, res : params.res}
            });
            return;
        }
        cb({result:'success'});
    });
}
exports.create = create;
var read = function(params, cb) {
    var username = params.username;
    var res = params.res;
    if (typeof username !== 'string') {
        process.nextTick(function() {
            throw { error : new Error("No username supplied to mysql read"), res : res}
        });
        return;
    }
    db('blob')
    .where('username','=',username)
    .select()
    .exec(function(err,rows) {
        if (err !== null) {
            process.nextTick(function() {
                throw { error : err, res: res }
            });
            return;
        }
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
    });
};
exports.read = read;

// params.hash = { key : value ,  key2 : value2 }  
// updates the blob
var update = function(params,cb) {
    var username = params.username;
    var hash = params.hash;
    var qs = "UPDATE `blob` SET ";
    var keys = Hash(hash).keys;
    var values = Hash(hash).values;
    Hash(hash).forEach(function(val,key) {
        qs = qs.concat('`' + key + '` = ? ,');
    });
    qs = qs.slice(0,-1); 
    qs = qs.concat(' WHERE `blob`.`username`=' + "'" + username + "'");
    db.query(qs,null, {raw:true}, values)
    .complete(function(err, results) {
        if (err == null)
            cb({result:'success'});
        else {
            process.nextTick(function() {
                throw { error : new Error("Error in updating mysql"), res : params.res}
            });
        }
    });
}
exports.update = update;

// readwhere finds all username and record that has the associated key /value pair
var read_where = function(params, cb) {
    var key = params.key;
    var value = params.value;
    db.query(
    "SELECT `username`, `address`, `email`, `email_token`, `email_verified` FROM `blob` WHERE `"+key+"` = ?", null,
    { raw: true }, [value]
    )
    .complete(function (err, rows) {
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
    });
};
exports.read_where = read_where;
exports.blobPatch = function(req,res,cb) {
    // XXX Check HMAC
    // XXX Check patch size
    // XXX Check quota
    db.query(
    "SELECT `id`, `revision` FROM `blob` WHERE `id` = ?", null,
    { raw: true }, [req.body.blob_id]
    )
    .complete(function (err, rows) {
        if (err) {
            process.nextTick(function() {
            throw { error : err , res : params.res }
            });
            return;
        }
        // XXX Check blob exists
        var blob = rows[0];
        db.query(
        "SELECT `revision` FROM `blob_patches` WHERE `blob_id` = ? " +
        "ORDER BY `revision` DESC " +
        "LIMIT 0,1", null,
        { raw: true }, [req.body.blob_id]
        )
        .complete(function (err, rows) {
            if (err) {
                process.nextTick(function() {
                throw { error : err , res : res }
                });
                return;
            }
            // XXX Race condition: another revision might get added at same time
            var lastRevision = +(rows.length ? rows[0].revision : blob.revision);
            // XXX Handle invalid base64
            var patch = new Buffer(req.body.patch, 'base64');
            db.query(
            "INSERT INTO `blob_patches` (`blob_id`, `revision`, `data`) " +
            "  VALUES (?, ?, ?)", null,
            { raw: true }, [req.body.blob_id, lastRevision + 1, patch])
            .complete(function (err) {
                if (err) {
                    process.nextTick(function() {
                    throw { error : err , res : res }
                    });
                    return;
                }
                cb({
                result: 'success',
                revision: lastRevision + 1
                });
            });
        });
    });
};


exports.blobConsolidate = function(req,res,cb) {
    // XXX Check blob exists

    // XXX Check HMAC

    // XXX Check quota

    var data = new Buffer(req.body.data, 'base64');
    db.query(
    "START TRANSACTION;" +
    "UPDATE `blob` SET `data` = ?, `revision` = ? WHERE `id` = ?;" +
    "DELETE FROM `blob_patches` WHERE `blob_id` = ? AND `revision` <= ?;" +
    "COMMIT;", null,
    { raw: true }, [data, req.body.revision, req.body.blob_id,
    req.body.blob_id, req.body.revision])
    .complete(function (err) {
        if (err) {
            process.nextTick(function() {
            throw { error : err , res : res }
            });
            return;
        }
        cb({
            result: 'success'
        });
    });
}


exports.blobDelete = function(req,res,cb) {
    // XXX Check blob exists

    // XXX Check HMAC

    db.query(
    "START TRANSACTION;" +
    "DELETE FROM `blob` WHERE `id` = ?;" +
    "DELETE FROM `blob_patches` WHERE `blob_id` = ?;" +
    "COMMIT;", null,
    { raw: true }, [req.body.blob_id, req.body.blob_id])
    .complete(function (err) {
        if (err) {
            process.nextTick(function() {
            throw { error : err , res : res }
            });
            return;
        }
        cb({
           result: 'success'
        });
    });
}
exports.blobGet = function(req,res,cb) {
    // XXX Check blob exists

    // XXX Check HMAC

    db.query(
    "SELECT data, revision FROM `blob` WHERE `id` = ?", null,
    { raw: true }, [req.params.blob_id])
    .complete(function (err, rows) {
        if (err) {
            process.nextTick(function() {
            throw { error : err , res : res }
            });
            return;
        }
        if (rows.length) {
            var blob = rows[0];
            db.query(
            "SELECT `data` FROM `blob_patches` WHERE `blob_id` = ?" +
            "  ORDER BY `revision` ASC", null,
            { raw: true }, [req.params.blob_id])
            .complete(function (err, rows) {
                if (err) {
                    process.nextTick(function() {
                        throw { error : err , res : res }
                    });
                    return;
                }
                // XXX Ensure patches are sequential starting with blob.revision+1
                cb({
                    result: 'success',
                    blob: blob.data.toString('base64'),
                    revision: blob.revision,
                    patches: rows.map(function (patch) {return patch.data.toString('base64');})
                });
            });
        } else {
            process.nextTick(function() {
                throw { error : new Error("Blob not found") , res : res }
            });
            return
        }
    });
};
exports.blobGetPatch = function(req,res,cb) {
    // XXX Check blob exists
    // XXX Check HMAC
    db.query("SELECT `data` FROM `blob_patches`" +
    "WHERE `blob_id` = ? AND `revision` = ?", null,
    { raw: true }, [req.params.blob_id, req.params.patch_id])
    .complete(function (err, result) {
        if (err) {
            process.nextTick(function() {
            throw { error : err , res : res }
            });
            return;
        }
        if (result.rows.length) {
            cb({
                result: 'success',
                patch: result.rows[0].data // XXX Convert to base64
            });
        }
    });
};
