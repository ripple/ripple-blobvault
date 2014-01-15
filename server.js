var config = require('./config');

var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');

var api = require('./api');

var app = express();
app.use(express.json());
app.use(express.urlencoded());

// Verify shared secret HMAC
function verifyHmac(reqBody, secret, sig) {
  
}

app.get('/authinfo', api.user.authinfo);
app.get('/user/:username', api.user.get);
app.post('/blob/create', api.blob.create);
app.post('/blob/patch', api.blob.patch);
app.post('/blob/consolidate', api.blob.consolidate);
app.post('/blob/delete', api.blob.delete);
app.get('/blob/:blob_id', api.blob.get);
app.get('/blob/:blob_id/patch/:patch_id', api.blob.getPatch);

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
