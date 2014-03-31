var config = require('../config');
var handleException = require('../lib/exceptionhandler').handleException;
var store = require('../lib/store');

var AUTHINFO_VERSION = 3;

function getUserInfo(username, res) {
  try {
    if ("string" !== typeof username) {
      handleException(new Error("Username is required"));
      return;
    }
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    store.read({username:username},function(err, response) {
        
    });

}

exports.authinfo = function (req, res) {
  getUserInfo(req.query.user, res);
};

exports.get = function (req, res) {
  getUserInfo(req.params.username, res);
};
