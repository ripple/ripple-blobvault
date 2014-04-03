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
};

module.exports = exports = store_memory;
