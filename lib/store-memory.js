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
        var obj = this.db[username];
        if (obj !== undefined) {
            cb(obj);
        } else {
            cb({result:'no such user'});
        }
    };
    this.create = create;
    this.read = read;
};

module.exports = exports = store_memory;
