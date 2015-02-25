console.log(__filename);
var config    = require('../config');
var Hash      = require('hashish');
var request   = require('request');
var http      = require('http');
var store     = require('../lib/store')(config.dbtype);
var api       = require('../api');
var hmac      = require('../lib/hmac');
var ecdsa     = require('../lib/ecdsa')(store);
var util      = require('util');
var cors      = require('cors')
var assert    = require('chai').assert;
var ripple    = require('ripple-lib');
var RVC       = ripple.VaultClient;
var express   = require('express');
var testutils = require('./utils');
var client    = new RVC('localhost:'+config.port);

var app = express();
var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
};

var server = null;
var testPerson = JSON.parse(JSON.stringify(testutils.person));

var validUrl = 'http://localhost:'+config.port+'/v1/user?' +
  'signature_account='  + testPerson.address +
  '&signature_blob_id=' + testPerson.blob_id;

suite('User Create', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    api.setStore(store);
    hmac.setStore(store);

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded());

    app.delete('/v1/user', hmac.middleware, api.blob.delete);
    app.post('/v1/user/ecdsa', ecdsa.middleware, api.blob.create);
    app.post('/v1/user', api.blob.create);
    app.get('/v1/user/:username', api.user.get);
    app.get('/v1/authinfo', api.user.authinfo);
    app.get('/ripple.txt', function (req, res, next) {
      res.send('[authinfo_url]\r\nhttp://localhost:'+config.port+'/v1/authinfo\r\n');
    });

    while(!ripple.sjcl.random.isReady()) {
      ripple.sjcl.random.addEntropy(require('crypto').randomBytes(128).toString('base64')); //add entropy to seed the generator
    }

    server= http.createServer(app);

    store.db('blob')
    .truncate()
    .then(function() {
      server.listen(config.port,function() {
        done();
      });
    });

  });

  // Teardown the Suite server
  suiteTeardown(function(done) {
    server.close(function() {
      done();
    });
  });

  // Tests

  test('invalid ecdsa signature', function(done) {
    request.post({
      url  : 'http://localhost:'+config.port+'/v1/user/ecdsa?' +
        'signature_account='  + testPerson.address +
        '&signature_type='    + 'ECDSA' +
        '&signature='         + 'zzzz' +
        '&signature_date='    + 'zzzz' +
        '&signature_blob_id=' + 'zzzz',
      json : testPerson
    }, function(err, resp, body) {
      assert.equal(resp.statusCode, 401);
      assert.strictEqual(body.result,  'error');
      assert.strictEqual(body.message, 'Unable to validate: Ripple Network error');
      assert.strictEqual(body.code,    6583);
      done();
    });
  });

  test('missing necessary keys', function(done) {
    var mod_person = Hash(testPerson).clone.end;
    delete mod_person.encrypted_secret;
    request.post({
      url  : validUrl,
      json : mod_person
    }, function(err, resp, body) {
      console.log("Missing Keys", resp.body);
      assert.equal(resp.statusCode,400,'encrypted secret is required');
      assert.equal(body.result,'error');
      assert.equal(body.message,'Missing keys');
      assert.ok(body.missing.encrypted_secret != undefined);
      done();
    });
  });

  test('valid user', function(done) {
    request.post({
      url : validUrl,
      json: testPerson
    }, function(err, resp, body) {
      console.log("Successful Create", resp.body);
      assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
      done();
    });
  });

  test('duplicate user', function(done) {
    request.post({
      url  : validUrl,
      json : testPerson
    }, function(err, resp, body) {
      assert.equal(resp.statusCode,400,'we should not be able to duplicate a user that already exists');
      done();
    });
  });

  test('unique ripple address/secret key', function(done) {
    var mod_person = Hash(testPerson).clone.end;
    mod_person.username = 'zed';
    request.post({
      url  : validUrl,
      json : mod_person
    }, function(err, resp, body) {
      console.log("Modify username", err, body);
      assert.equal(resp.statusCode,400,'we should not be create a new person with the same ripple address');
      done();
    });
  });

  test('delete the user', function(done) {
    var sig = testutils.createSignature({
      method : 'DELETE',
      url    : '/v1/user',
      secret : testPerson.auth_secret,
      date   : testPerson.date
    });

    var url = 'http://localhost:' + config.port + '/v1/user?' +
      'signature=' + sig +
      '&signature_date='+testPerson.date +
      '&signature_blob_id='+ testPerson.blob_id;

    console.log(url);
    request.del({
        url  : url,
        json : true
    }, function(err, resp, body) {
      assert.equal(resp.statusCode,200,'after delete request, status code should be 200');
      done();
    });
  });

});
