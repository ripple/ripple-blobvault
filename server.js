var config = require('./config');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var store = require('./lib/store')(config.dbtype);
var hmac = require('./lib/hmac');
var ecdsa = require('./lib/ecdsa')(store);
var api = require('./api');
var reporter = require('./lib/reporter');
var guard = require('./guard')(store)
var limiter = guard.resend_email();
var requestAttestation = require('./api/requestAttestation')

var Ddos= require('ddos');
var ddos = new Ddos;

var health = require('./health')(store.db)
health.start()

api.setStore(store);
hmac.setStore(store);

var app = express();
app.use(ddos.express)
app.use(reporter.inspect);

// app.use(express.limit('1mb')); is deprecated and has no functionality
// now delegated to raw-body; has a default 1mb limit 

app.use(express.json());
app.use(express.urlencoded());

var cors = require('cors');
app.use(cors());

// JSON handlers
app.post('/v1/user', ecdsa.middleware, api.blob.create);
app.post('/v1/user/email', limiter.check, ecdsa.middleware, api.user.emailChange);
app.post('/v1/user/email/resend', limiter.check, api.user.emailResend);
app.post('/v1/user/:username/rename', ecdsa.middleware, api.user.rename);
app.post('/v1/user/:username/updatekeys', ecdsa.middleware, api.user.updatekeys);
app.get('/v1/user/recov/:username', ecdsa.recov, api.user.recov);
app.post('/v1/user/:username/profile', hmac.middleware, api.user.profile);

app.post('/v1/lookup', api.user.batchlookup)

app.delete('/v1/user/:username', ecdsa.middleware, api.blob.delete);
app.get('/v1/user/:username', api.user.get);
app.get('/v1/user/:username/verify/:token', api.user.verify);

// blob related
app.get('/v1/blob/:blob_id', api.blob.get);
app.post('/v1/blob/patch', hmac.middleware, api.blob.patch);
app.get('/v1/blob/:blob_id/patch/:patch_id', api.blob.getPatch);
app.post('/v1/blob/consolidate', hmac.middleware, api.blob.consolidate);

// old phone validation
app.post('/v1/user/:username/phone', api.user.phoneRequest)
app.post('/v1/user/:username/phone/validate', api.user.phoneValidate)

// 2FA
app.post('/v1/blob/:blob_id/2fa', ecdsa.middleware, api.user.set2fa)
app.get('/v1/blob/:blob_id/2fa', ecdsa.middleware, api.user.get2fa)
app.get('/v1/blob/:blob_id/2fa/requestToken', api.user.request2faToken)
app.post('/v1/blob/:blob_id/2fa/verifyToken', api.user.verify2faToken)

// profile route
app.post('/v1/attest/:identity_id', hmac.middleware, requestAttestation)
app.post('/v1/profile/:identity_id', hmac.middleware, api.user.setProfile)
app.get('/v1/profile/:identity_id', hmac.middleware, api.user.getProfile)

app.get('/v1/authinfo', api.user.authinfo);
app.get('/health', health.status);
app.get('/logs', api.blob.logs);

try {
  var server = config.ssl ? https.createServer({
    key: fs.readFileSync(__dirname + '/blobvault.key'),
    ca: fs.readFileSync(__dirname + '/intermediate.crt'),
    cert: fs.readFileSync(__dirname + '/blobvault.crt')
  }, app) : http.createServer(app);
  var port = config.port || (config.ssl ? 443 : 8080);
  server.listen(port, config.host);
  reporter.log("Blobvault listening on port "+port);
} catch (e) {
  reporter.log("Could not launch SSL server: " + (e.stack ? e.stack : e.toString()));
}

process.on('SIGTERM',function() {
    reporter.log("caught sigterm");
    process.exit();
});
process.on('SIGINT',function() {
    reporter.log("caught sigint");
    process.exit();
});
process.on('exit',function() {
    reporter.log("Shutting down.");
//    emailCampaign.stop();
    if (store.db && store.db.client)
        store.db.client.pool.destroy();
    reporter.log("Done");
});
