var config = require('../config');
var handleException = require('../lib/exceptionhandler').handleException;
var db = require('../lib/db').connection;

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

    db.query(
      "SELECT `username` FROM `blob` WHERE `username` = ?",
      [username],
      function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        var response = {
          username: username,
          version: AUTHINFO_VERSION,
          blobvault: config.url,
          pakdf: config.defaultPakdfSetting
        };

        if (rows.length) {
          var row = rows[0];
          response.username = row.username;
          response.exists = true;
          res.json(response);
        } else if (config.reserved[username.toLowerCase()]) {
          response.exists = false;
          response.reserved = config.reserved[username.toLowerCase()];
          res.json(response);
        } else {
          response.exists = false;
          response.reserved = false;
          res.json(response);
        }
      });
	} catch (e) {
    handleException(res, e);
	}
}

exports.authinfo = function (req, res) {
  getUserInfo(req.query.user, res);
};

exports.get = function (req, res) {
  getUserInfo(req.params.username, res);
};
