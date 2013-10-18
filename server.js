var config = require('./config');

var http = require('http');
var https = require('https');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');

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

app.post('/blob/create', function (req, res) {
	try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    // XXX Ensure blob_id is a 32-byte hex

    // XXX Ensure blob does not exist yet

    // XXX Check account "address" exists

    // XXX Ensure there is no blob for this account yet

    // XXX Check signature

    // XXX Convert blob from base64 to binary

    var data = new Buffer(req.body.data, 'base64');

    c.query(
      "INSERT INTO `blob` (`id`, `address`, `auth_secret`, `data`) " +
      "VALUES (?, ?, ?, ?)",
      [req.body.blob_id, req.body.address, req.body.auth_secret, data],
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
      "SELECT FROM `blob` WHERE `id` = ?",
      [req.body.blob_id],
      function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        // XXX Check blob exists

        var blob = rows[0];

        c.query(
          "SELECT revision FROM `blob_patches` WHERE `blob_id` = ?" +
          "ORDER BY `revision` DESC" +
          "LIMIT 0,1",
          [req.body.blob_id],
          function (err, rows) {
            if (err) {
              handleException(res, err);
              return;
            }

            var lastRevision = rows.length ? rows[0].revision : blob.revision;

            c.query(
              "INSERT INTO `blob_patches` (`blob_id`, `revision`, `data`) " +
                "  VALUES (?, ?, ?)",
              [req.body.blob_id, lastRevision + 1, req.body.patch],
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

    c.query(
      "START TRANSACTION;" +
      "UPDATE `blob` SET `data` = ?, `revision` = ?;" +
      "DELETE FROM `blob_patches` WHERE `blob_id` = ? AND `revision` <= ?;" +
      "COMMIT;",
      [req.body.data, req.body.revision,
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
                patches: rows // XXX Convert to base64
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
