var config = require('./config');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var hmac = require('./lib/hmac');
var api = require('./api');
var store = require('../lib/store')(config.dbtype);
api.blob.store = store;
api.user.store = store;
hmac.store = store;


var app = express();
app.use(function(req,res,next) {
    console.log(req.method + " " + req.url);
    console.log(req.headers);
    console.log(req.body);
    next();
});
app.use(express.json());
app.use(express.urlencoded());


app.get('/authinfo', api.user.authinfo);
app.get('/user/:username', api.user.get);
app.get('/user/:username/verify/:token', api.user.verify);

app.post('/blob/create', api.blob.create);
app.post('/blob/patch', hmac.middleware, api.blob.patch);
app.post('/blob/consolidate', hmac.middleware, api.blob.consolidate);
app.post('/blob/delete', hmac.middleware, api.blob.delete);
app.get('/blob/:blob_id', api.blob.get);
app.get('/blob/:blob_id/patch/:patch_id', api.blob.getPatch);


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
