var db = require('./db-mysql').connection;
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

    db
    .query(
        "INSERT INTO `blob` (`id`, `username`, `address`, `auth_secret`, `data`, `email_verified`, `email`, `email_token`) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", null,
        { raw: true }, [blobId, username, address, authSecret, data, emailVerified, email, emailToken ]
    )
    .complete(function (err, rows) {
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
    db.query(
    "SELECT `username`, `address`, `email`, `email_token`, `email_verified` FROM `blob` WHERE `username` = ?", null,
    { raw: true }, [username]
    )
    .complete(function (err, rows) {
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
