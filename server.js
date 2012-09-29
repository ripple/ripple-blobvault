var express = require('express');
var mysql = require('mysql');

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

app.post('/:key', function (req, res) {
  res.set({
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*'
  });
  
  c.query(
    "INSERT INTO blobs(k, v, updated, ip_last_updated_from) VALUES (?, ?, NOW(), INET_ATON(?)) \
      ON DUPLICATE KEY UPDATE v = VALUES(v), \
                              updated = NOW(), \
                              ip_last_updated_from = VALUES(ip_last_updated_from)",
    [req.params.key, req.body.blob, req.ip]
  );
  
  res.send();
});

app.listen(51235);