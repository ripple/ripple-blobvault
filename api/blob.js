var response = require('response');
var Queue = require('queuelib');
var config = require('../config');
var libutils = require('../lib/utils')

exports.store; 
var q = new Queue;
var create = function (req, res) {
    var blobId = req.body.blob_id;
    if ("string" !== typeof blobId) {
        process.nextTick(function() {
            throw { res : res , error : new Error("No blob ID given.")};
        })
        return;
    } else {
        blobId = blobId.toLowerCase();
    }

    if (!/^[0-9a-f]{64}$/.exec(blobId)) {
        process.nextTick(function() {
          throw { res : res, error : new Error("Blob ID must be 32 bytes hex.") }
        });
       return;
    }

    var username = req.body.username;
    if ("string" !== typeof username) {
        process.nextTick(function() {
            throw { res : res , error : new Error("No username given.") }
        });
        return;
    } 
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,13}[a-zA-Z0-9]$/.exec(username)) {
        process.nextTick(function() {
            throw { res : res , error : new Error("Username must be between 2 and 15 alphanumeric" + " characters or hyphen (-)." + " Can not start or end with a hyphen.")}
        });
        return;
    }
    if (/--/.exec(username)) {
        process.nextTick(function() {
            throw { res : res, error : new Error("Username cannot contain two consecutive hyphens.")}
        });
        return;
    }

    if (config.reserved[username.toLowerCase()]) {
        process.nextTick(function() {
            throw { res : res, error : new Error("This username is reserved for "+config.reserved[username.toLowerCase()]+'.')}
        });
        return;
    }

    var authSecret = req.body.auth_secret;
    if ("string" !== typeof authSecret) {
        process.nextTick(function() {
            throw { res : res, error : new Error("No auth secret given.") }
        });
        return;
    }

    authSecret = authSecret.toLowerCase();
    if (!/^[0-9a-f]{64}$/.exec(authSecret)) {
        process.nextTick(function() {
            throw { res : res, error : new Error("Auth secret must be 32 bytes hex.") }
        });
        return;
    }

    if (req.body.data === undefined) {
        process.nextTick(function() {
            throw { res : res, error : new Error("No data provided.") }
        });
        return;
    }

    if (req.body.address == undefined) {
        process.nextTick(function() {
            throw { res : res, error : new Error("No ripple address provided.") }
        });
        return;
    } 

    if (req.body.email == undefined) {
        process.nextTick(function() {
            throw { res : res, error : new Error("No email address provided.") }
        });
        return;
    } 

    // XXX Ensure blob does not exist yet

    // XXX Check account "address" exists
    // dont you mean not exist in order to create?

    // XXX Ensure there is no blob for this account yet

    q.series([
    function(lib,id) {
        exports.store.read({username:username},function(resp) {
            if (resp.exists === false) {
                lib.done();
            } else {
                process.nextTick(function() {
                    throw { res : res, error : new Error("User already exists.") }
                });
                lib.terminate(id);
                return;
            }
       });
    },
    function(lib) { 
        // XXX Check signature

        // TODO : inner key is required on updates
        var params = {
            data:req.body.data,
            authSecret:authSecret,
            blobId:blobId,
            address:req.body.address,
            username:username,
            emailVerified:false,
            email:req.body.email,
            emailToken:libutils.generateToken()
        };
        exports.store.create(params,function(resp) {
            if (resp.err) {
                process.nextTick(function() {
                    throw { res : res, error : new Error("problem with create")}
                });
                lib.done();
                return;
            }
            response.json({result:'success'}).pipe(res);
            lib.done();
        });
    }
    ]);
};
exports.create = create;
exports.patch = function (req, res) {
    store.blobPatch(req,res,function(resp) {
    });
};

exports.consolidate = function (req, res) {
    store.blobConsolidate(req,res,function(resp) {
    });    
};

exports.delete = function (req, res) {
    store.blobDelete(req,res,function(resp) {
    });
};

exports.get = function (req, res) {
    store.blobGet(req,res,function(resp) {
    });
};


exports.getPatch = function (req, res) {
    store.blobGetPatch(req,res,function(resp) {
    });
};
