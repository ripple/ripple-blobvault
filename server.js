var config = require('./config');

var http = require('http');
var https = require('https');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');

var AUTHINFO_VERSION = 3;

config.mysql.multipleStatements = true;

var c = mysql.createConnection(config.mysql);
c.connect();

var app = express();
app.use(express.bodyParser());

// Handle an exception and post an error response
function handleException(res, err) {
	console.log("Exception:", (err && err.stack) ? err.stack : err);
  // XXX Error message
  res.json({
    result: 'error'
  });
}

// Verify shared secret HMAC
function verifyHmac(reqBody, secret, sig) {
  
}

function getUserInfo(username, res)
{
  try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    c.query(
      "SELECT `username` FROM `blob` WHERE `username` = ?",
      [username],
      function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        if (rows.length) {
          var row = rows[0];
          res.json({
            username: row.username,
            exists: true,
            version: AUTHINFO_VERSION,
            blobvault: config.url,
            pakdf: config.defaultPakdfSetting
          });
        } else {
          res.json({
            username: username,
            exists: false,
            // We still need to return the information the client needs to
            // register this user
            version: AUTHINFO_VERSION,
            blobvault: config.url,
            pakdf: config.defaultPakdfSetting
          });
        }
      });
	} catch (e) {
    handleException(res, e);
	}
}

app.get('/authinfo', function (req, res) {
  getUserInfo(req.query.user, res);
});

app.get('/user/:username', function (req, res) {
  getUserInfo(req.params.username, res);
});

app.post('/blob/create', function (req, res) {
	try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    var blobId = req.body.blob_id;
    if ("string" !== typeof blobId) {
      handleException(res, new Error("No blob ID given."));
      return;
    }
    blobId = blobId.toLowerCase();
    if (!/^[0-9a-f]{64}$/.exec(blobId)) {
      handleException(res, new Error("Blob ID must be 32 bytes hex."));
      return;
    }

    var username = req.body.username;
    if ("string" !== typeof username) {
      handleException(res, new Error("No username given."));
      return;
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,13}[a-zA-Z0-9]$/.exec(username)) {
      handleException(res, new Error("Username must be between 2 and 15 alphanumeric"
                                     + " characters or hyphen (-)."
                                     + " Can not start or end with a hyphen."));
      return;
    }
    if (/--/.exec(username)) {
      handleException(res, new Error("Username cannot contain two consecutive hyphens."));
      return;
    }

    // XXX Ensure blob does not exist yet

    // XXX Check account "address" exists

    // XXX Ensure there is no blob for this account yet

    // XXX Check signature

    // Convert blob from base64 to binary
    var data = new Buffer(req.body.data, 'base64');

    c.query(
      "INSERT INTO `blob` (`id`, `username`, `address`, `auth_secret`, `data`) " +
      "VALUES (?, ?, ?, ?, ?)",
      [blobId, username, req.body.address, req.body.auth_secret, data],
      function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        res.json({
          result: 'success'
        });
      }
    );
	} catch (e) {
    handleException(res, e);
	}
});

app.post('/blob/patch', function (req, res) {
	try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    // XXX Check HMAC

    // XXX Check patch size

    // XXX Check quota

    c.query(
      "SELECT `id`, `revision` FROM `blob` WHERE `id` = ?",
      [req.body.blob_id],
      function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        // XXX Check blob exists

        var blob = rows[0];

        c.query(
          "SELECT `revision` FROM `blob_patches` WHERE `blob_id` = ? " +
          "ORDER BY `revision` DESC " +
          "LIMIT 0,1",
          [req.body.blob_id],
          function (err, rows) {
            if (err) {
              handleException(res, err);
              return;
            }

            // XXX Race condition: another revision might get added at same time

            var lastRevision = +(rows.length ? rows[0].revision : blob.revision);

            // XXX Handle invalid base64

            var patch = new Buffer(req.body.patch, 'base64');

            c.query(
              "INSERT INTO `blob_patches` (`blob_id`, `revision`, `data`) " +
              "  VALUES (?, ?, ?)",
              [req.body.blob_id, lastRevision + 1, patch],
              function (err) {
                if (err) {
                  handleException(res, err);
                  return;
                }

                res.json({
                  result: 'success',
                  revision: lastRevision + 1
                });
              }
            );
          }
        );
      }
    );

  } catch (e) {
    handleException(res, e);
	}
});

app.post('/blob/consolidate', function (req, res) {
	try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    // XXX Check blob exists

    // XXX Check HMAC

    // XXX Check quota

    var data = new Buffer(req.body.data, 'base64');

    c.query(
      "START TRANSACTION;" +
      "UPDATE `blob` SET `data` = ?, `revision` = ? WHERE `id` = ?;" +
      "DELETE FROM `blob_patches` WHERE `blob_id` = ? AND `revision` <= ?;" +
      "COMMIT;",
      [data, req.body.revision, req.body.blob_id,
       req.body.blob_id, req.body.revision],
      function (err) {
        if (err) {
          handleException(res, err);
          return;
        }

        res.json({
          result: 'success'
        });
      }
    );

  } catch (e) {
    handleException(res, e);
	}
});

app.post('/blob/delete', function (req, res) {
	try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    // XXX Check blob exists

    // XXX Check HMAC

    c.query(
      "START TRANSACTION;" +
      "DELETE FROM `blob` WHERE `id` = ?;" +
      "DELETE FROM `blob_patches` WHERE `blob_id` = ?;" +
      "COMMIT;",
      [req.body.blob_id, req.body.blob_id],
      function (err) {
        if (err) {
          handleException(res, err);
          return;
        }

        res.json({
          result: 'success'
        });
      }
    );

  } catch (e) {
    handleException(res, e);
	}
});

app.get('/blob/:blob_id', function (req, res) {
	try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    // XXX Check blob exists

    // XXX Check HMAC

    c.query(
      "SELECT data, revision FROM `blob` WHERE `id` = ?",
      [req.params.blob_id],
      function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        if (rows.length) {
          var blob = rows[0];
          c.query(
            "SELECT `data` FROM `blob_patches` WHERE `blob_id` = ?" +
            "  ORDER BY `revision` ASC",
            [req.params.blob_id],
            function (err, rows) {
              if (err) {
                handleException(res, err);
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
          handleException(res, new Error("Blob not found"));
        }
      }
    );

  } catch (e) {
    handleException(res, e);
	}
});


app.get('/blob/:blob_id/patch/:patch_id', function (req, res) {
	try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    // XXX Check blob exists

    // XXX Check HMAC

    c.query(
      "SELECT `data` FROM `blob_patches` WHERE `blob_id` = ? AND `revision` = ?",
      [req.params.blob_id, req.params.patch_id],
      function (err, result) {
        if (err) {
          handleException(res, err);
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
      }
    );

  } catch (e) {
    handleException(res, e);
	}
});


try {
  var server = config.ssl ? https.createServer({
    key: fs.readFileSync(__dirname + '/blobvault.key'),
    ca: fs.readFileSync(__dirname + '/intermediate.crt'),
    cert: fs.readFileSync(__dirname + '/blobvault.crt')
  }, app) : http.createServer(app);
  server.listen(config.port || (config.ssl ? 443 : 8080), config.host);
} catch (e) {
  console.log("Could not launch SSL server: " + (e.stack ? e.stack : e.toString()));
}
