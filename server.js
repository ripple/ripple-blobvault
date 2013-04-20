var https = require('https');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');

var c = mysql.createConnection({
  host: 'localhost',
  port: '3306',
  database: 'blob_vault',
  user: 'blobby',
  password: '57umtSMG4Fyv5ary'
});
c.connect();

var app = express();
app.use(express.bodyParser());

app.get('/:key', function (req, res) {
  // the path of the GET request is a key stored in table `blobs`, column `k`
  // if a value is found, it is returned in the response, otherwise, an empty
  // response is returned.

  try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    
    c.query(
      "SELECT v FROM blobs WHERE k = ? LIMIT 1",
      [req.params.key],
      function (err, qres) {
        res.send(qres.length ? qres[0].v : "");
      }
    );
  } catch(e) {
    console.log("Exception in GET /" + req.params.key + ": " + e);
    c.connect(); 
  }
  
});

var sjcl = require('sjcl');

function verifies(pubKey, sig, data) {
  // This function verifies a ECDSA signature on a data string.
  // 
  // Arguments:
  //   pubKey: base64-encoded public ECDSA key
  //   sig: base64-encoded signature
  //   data: ascii string of data
  //   

  var curve = sjcl.ecc.curves.c192,
      pubBits = sjcl.codec.base64.toBits(pubKey),
      ecdsaPublicKey = new sjcl.ecc.ecdsa.publicKey(curve, pubBits),
      sigBits = sjcl.codec.base64.toBits(sig);

  return ecdsaPublicKey.verify(sjcl.hash.sha256.hash(data), sigBits);
}

function insert_blob(req) {
  c.query(
    "INSERT INTO blobs (k, v, pub_key, updated, ip_last_updated_from) VALUES (?, ?, ?, NOW(), INET_ATON(?)) \
      ON DUPLICATE KEY UPDATE v = VALUES(v), \
                              pub_key = VALUES(pub_key), \
                              updated = NOW(), \
                              ip_last_updated_from = VALUES(ip_last_updated_from)",
    [req.params.key, req.body.blob, req.body.new_pub || "", req.ip]
  );
}

app.post('/:key', function (req, res) {
  // POST parameters are:
  //   blob: ascii encoded blob to store.
  //   sig: base64 encoded signature of sha256 hash of blob, required
  //     if a row with that key already exists and has a pub_key.
  //   new_pub: base64 encoded public key to replace existing one.
  //

  try {
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });

    c.query(
      "SELECT pub_key FROM blobs WHERE k = ? LIMIT 1",
      [req.params.key],
      function (err, qres) {
        if (qres.length && qres[0].pub_key) {
          if (verifies(qres[0].pub_key, req.body.sig, req.body.blob)) {
            insert_blob(req);
          }
        } else {
          insert_blob(req);
        }
        res.send();
      }
    )
  } catch(e) {
    console.log("Exception in POST /" + req.params.key + ": " + e);
    c.connect();
  }
});

app.listen(80);

try {
  var https = https.createServer({
    key: fs.readFileSync(__dirname + '/blobvault.key'),
    ca: fs.readFileSync(__dirname + '/intermediate.crt'),
    cert: fs.readFileSync(__dirname + '/blobvault.crt')
  }, app);
  https.listen(443);
} catch (e) {
  console.log("Could not launch SSL server: " + (e.stack ? e.stack : e.toString()));
}
