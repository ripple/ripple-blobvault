var mysql = require('mysql');
var c = mysql.createConnection({
  host: 'localhost',
  port: '3306',
  database: 'blob_vault',
  user: 'blobby',
  password: '57umtSMG4Fyv5ary'
});
c.connect();

var express = require('express');
var app = express();
app.use(express.bodyParser());

app.get('/:key', function (req, res) {
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
  
});

var sjcl = require('sjcl');
function verifies(pubKey, sig, data) {
  try {
    var curve = sjcl.ecc.curves.c192,
        pubBits = sjcl.codec.base64.toBits(pubKey),
        pubKey = new sjcl.ecc.ecdsa.publicKey(curve, pubBits),
        sigBits = sjcl.codec.base64.toBits(sig);

    return pubKey.verify(sjcl.hash.sha256.hash(data), sigBits);
  } catch (e) { }
}

function insert_blob(req) {
  c.query(
    "INSERT INTO blobs(k, v, pub_key, updated, ip_last_updated_from) VALUES (?, ?, ?, NOW(), INET_ATON(?)) \
      ON DUPLICATE KEY UPDATE v = VALUES(v), \
                              pub_key = VALUES(pub_key), \
                              updated = NOW(), \
                              ip_last_updated_from = VALUES(ip_last_updated_from)",
    [req.params.key, req.body.blob, req.body.new_pub || "", req.ip]
  );
}

app.post('/:key', function (req, res) {
  res.set({
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*'
  });
  
  c.query(
    "SELECT pub_key FROM blobs WHERE k = ? LIMIT 1",
    [req.params.key],
    function (err, qres) {
      if (qres.length && qres[0].pub_key) {
        verifies(qres[0].pub_key, req.body.sig, req.body.blob) && insert_blob(req);
      } else {
        insert_blob(req);
      }
      res.send();
    }
  )
});

app.listen(51235);