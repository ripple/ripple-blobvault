var config = require('./config');

var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var hmac = require('./lib/hmac');
var argv = require('optimist')
    .usage('Usage $0 -s [mysql, memory, postgres]')
    .describe('s','storage type : mysql, memory, postgres')
    .default('s','mysql')
    .argv; 

var api = require('./api');

var app = express();
app.use(express.json());
app.use(express.urlencoded());


app.get('/authinfo', api.user.authinfo);
app.get('/user/:username', api.user.get);
app.post('/blob/create', api.blob.create);
app.post('/blob/patch', hmac.middleware, api.blob.patch);
app.post('/blob/consolidate', hmac.middleware, api.blob.consolidate);
app.post('/blob/delete', hmac.middleware, api.blob.delete);
app.get('/blob/:blob_id', api.blob.get);
app.get('/blob/:blob_id/patch/:patch_id', api.blob.getPatch);


//app.post('verify/create', verify.create) // post email / user data -> create token / associate -- > generate return 
app.get('/verify/:token', verify.verify); // get token -> prove email ownership - > record association confirmation -> generate return


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
