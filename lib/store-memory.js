var config = require('../config');
var Hash = require('hashish');
var store_memory = function() {
    this.db = {};
    var create = function(params,cb) {
        var blobId = params.blobId;
        var username = params.username;
        var address = params.address;
        var authSecret = params.authSecret;
        // Convert blob from base64 to binary
        var data = new Buffer(params.data, 'base64');

        // email related
        var emailVerified = params.emailVerified;
        var email = params.email;
        var emailToken = params.emailToken;
         
        this.db[username] = {
            blobId : blobId,
            username : username,
            address : address,
            authSecret : authSecret,
            data : data,
            emailVerified : emailVerified,
            email : email,
            emailToken : emailToken 
        };
        cb({result:'success'});
    }
// readwhere finds all username and record that has the associated key /value pair
    var read_where = function(params, cb) {
        var key = params.key;
        var value = params.value;
        var obj = Hash(this.db)
        .detect(function(item) {
            return (item[key] == value)
        });

        var response = {};
        response.version= config.AUTHINFO_VERSION;
        response.blobvault= config.url;
        response.pakdf= config.defaultPakdfSetting;

        if (obj !== undefined) {
            response.username= obj.username;
            response.emailVerified= obj.emailVerified;
            response.email=obj.email;
            response.emailToken=obj.emailToken;
            response.address = obj.address;
            response.exists = true;
        } else {
            response.exists = false;
        }

/*
        if (Object.keys(response).length == 0) {
            response.exists = false;
*/
        cb(response);
    };
    var read = function(params, cb) {
        var username = params.username;
        var response = {};
        response.username= username;
        response.version= config.AUTHINFO_VERSION;
        response.blobvault= config.url;
        response.pakdf= config.defaultPakdfSetting;
        var obj = this.db[username];
        if (obj !== undefined) {
            response.emailVerified= obj.emailVerified;
            response.email=obj.email;
            response.emailToken=obj.emailToken;
            response.address = obj.address;
            response.exists = true;
        } else if (config.reserved[username.toLowerCase()]) {
            response.exists = false;
            response.reserved = config.reserved[username.toLowerCase()];
        } else {
            response.exists = false;
            response.reserved = false;
        }
        cb(response);
    };
    var update = function(params, cb) {
        var username = params.username;
        var hash = params.hash;
        if (this.db[username] !== undefined) {
            Hash(this.db[username]).update(hash);
        } else {
            process.nextTick(function() {
                throw { error : new Error("Error in updating, non-existant user") , res : params.res}
            });
            return;
        }
        cb({result:'success'}); 
    };


    var blobPatch = function(req,cb) {
        cb({result:'blobPatch not implemented in memory'});
/*
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
            throw { error : err , res : res }
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

                    res.json({
                    result: 'success',
                    revision: lastRevision + 1
                    });
                });
            }
        );
*/
    };

    var blobConsolidate = function(req,cb) {
        cb({result:'blobConsolidate not implemented in memory'});
/*
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
            res.json({
                result: 'success'
            });
        });
*/
    }


    var blobDelete = function(req,cb) {
        cb({result:'blobDelete not implemented in memory'});
/*
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

            res.json({
              result: 'success'
            });
          }
        );
*/
    }

    var blobGet = function(req,cb) {
        cb({result:'blobGet not implemented in memory'});
/*
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

            res.json({
            result: 'success',
            blob: blob.data.toString('base64'),
            revision: blob.revision,
            patches: rows.map(function (patch) {
            return patch.data.toString('base64');
            })
            });
            }
            );
            } else {
            process.nextTick(function() {
            throw { error : new Error("Blob not found") , res : res }
            });
            return
            }
            }
        );
*/
    };

    var blobGetPatch = function(req,cb) {
        cb({result:'blobGetPatch not implemented in memory'});
/*
        // XXX Check blob exists

        // XXX Check HMAC

        db.query(
        "SELECT `data` FROM `blob_patches`" +
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
            res.json({
            result: 'success',
            patch: result.rows[0].data // XXX Convert to base64
            });
            } else {
            // XXX Handle error
            }
        });
*/
    }
    var hmac_getSecret = function(blobId, callback) {
/*
        db.query('SELECT `auth_secret` FROM `blob` WHERE id = ?', null,
        { raw: true }, [blobId])
        .complete(function (err, rows) {
        if (err) {
        callback(err);
        return;
        }

        if (!rows.length) {
        callback(new Error("Invalid blobId"));
        return;
        }

        callback(null, rows[0].auth_secret);
        });
*/
    };
    this.hmac_getSecret = hmac_getSecret;
    this.blobPatch = blobPatch;
    this.blobConsolidate = blobConsolidate;
    this.blobDelete = blobDelete;
    this.blobGet = blobGet;
    this.blobGetPatch = blobGetPatch;
    this.create = create;
    this.read = read;
    this.update = update;
    this.read_where = read_where;
};


module.exports = exports = store_memory;
