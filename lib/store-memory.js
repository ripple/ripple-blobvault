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
            response.reserved = false;
        }

/*
        } else if (config.reserved[obj.username.toLowerCase()]) {
            response.exists = false;
            response.reserved = config.reserved[obj.username.toLowerCase()];
        } else {
            response.exists = false;
            response.reserved = false;
        }
*/
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
    this.create = create;
    this.read = read;
    this.update = update;
    this.read_where = read_where;
};

module.exports = exports = store_memory;
