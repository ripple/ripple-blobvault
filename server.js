var config = require('./config');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var store = require('./lib/store')(config.dbtype);
var hmac = require('./lib/hmac');
var ecdsa = require('./lib/ecdsa');
var api = require('./api');
var lib = require('./lib');
api.setStore(store);
hmac.setStore(store);

var app = express();
app.use(lib.inspect);

// app.use(express.limit('1mb')); is deprecated and has no functionality
// now delegated to raw-body; has a default 1mb limit 

app.use(express.json());
app.use(express.urlencoded());

var cors = require('cors');
app.use(cors());

// JSON handlers
app.post('/v1/user', ecdsa.middleware, api.blob.create);

app.delete('/v1/user', hmac.middleware, api.blob.delete);
app.get('/v1/user/:username', api.user.get);
app.get('/v1/user/:username/verify/:token', api.user.verify);

// JSON handlers
app.get('/v1/blob/:blob_id', api.blob.get);
app.post('/v1/blob/patch', hmac.middleware, api.blob.patch);
app.get('/v1/blob/:blob_id/patch/:patch_id', api.blob.getPatch);
app.post('/v1/blob/consolidate', hmac.middleware, api.blob.consolidate);

app.get('/v1/authinfo', api.user.authinfo);

app.get('/logs', api.blob.logs);

try {
  var server = config.ssl ? https.createServer({
    key: fs.readFileSync(__dirname + '/blobvault.key'),
    ca: fs.readFileSync(__dirname + '/intermediate.crt'),
    cert: fs.readFileSync(__dirname + '/blobvault.crt')
  }, app) : http.createServer(app);
  var port = config.port || (config.ssl ? 443 : 8080);
  server.listen(port, config.host);
  console.log("Blobvault listening on port "+port);
} catch (e) {
  console.log("Could not launch SSL server: " + (e.stack ? e.stack : e.toString()));
}

var Campaign = require('./lib/emailcampaign');
var emailCampaign = new Campaign(store.db,config.schedule);
// emailCampaign.start();

process.on('SIGTERM',function() {
    console.log("caught sigterm");
    process.exit();
});
process.on('SIGINT',function() {
    console.log("caught sigint");
    process.exit();
});
process.on('exit',function() {
    console.log("Shutting down.");
    emailCampaign.stop();
    if (store.db && store.db.client)
        store.db.client.pool.destroy();
    console.log("Done");
});
