console.log(__filename);
var config    = require('../config');
var request   = require('request');
var http      = require('http');
var api       = require('../api');
var hmac      = require('../lib/hmac');
var store     = require('../lib/store')(config.dbtype);
var util      = require('util');
var queuelib  = require('queuelib');
var express   = require('express');
var assert    = require('chai').assert;
var reporter  = require('../lib/reporter');
var ecdsa     = require('../lib/ecdsa')(store)
var guard     = require('../guard')(store)
var limiter   = guard.resend_email();
api.setStore(store);
hmac.setStore(store);

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test Email Change Resend', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    app.use(express.json());
    app.use(express.urlencoded());

    app.post('/v1/user/email', api.user.emailResend);
    app.get('/v1/user/:username',api.user.get);
    app.get('/v1/user/:username/verify/:token',api.user.verify);
    app.post('/v1/user',api.blob.create);
    app.delete('/v1/user',hmac.middleware, api.blob.delete);

    server = http.createServer(app);

    store.db('blob')
    .truncate()
    .then(function() {
      return store.db('twofactor')
      .truncate();
    })
    .then(function() {
      server.listen(5050,function() {
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
  test('Change email', function(done) {
    request.post({
      url:'http://localhost:5050/v1/user?' +
        'signature_account='  + testPerson.address +
        '&signature_blob_id=' + testPerson.blob_id,
      json: testPerson
    },
    function(err, resp, body) {
      assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');

      request.post({
        url:'http://localhost:5050/v1/user/email?' +
          'signature_account='  + testPerson.address +
          '&signature_blob_id=' + testPerson.blob_id,
        json: {email:'bit@bit.com', hostlink:'asdf'}
      },
      function(err, resp, body) {
        assert.ifError(err);
        assert.strictEqual(body.result, 'success');
        store.read_where({key:'id',value:testPerson.blob_id},function(rows) {
          assert.strictEqual(rows.length, 1);
          assert.strictEqual(rows[0].email,'bit@bit.com');
          done();
        });
      });

    });

  });

  test('Resend request', function(done) {
    request.post({
      url:'http://localhost:5050/v1/user/email?' +
        'signature_account='  + testPerson.address +
        '&signature_blob_id=' + testPerson.blob_id,
      json: {email:'bob@example.com',hostlink:'12345'}
    },
    function(err, resp, body) {
      assert.ifError(err);
      assert.strictEqual(body.result, 'success');

      store.read_where({key:'id',value:testPerson.blob_id},function(rows) {
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].email,'bob@example.com');
        assert.strictEqual(rows[0].hostlink,'12345');
        assert.strictEqual(rows[0].email_verified, false);
        done();
      });

    });
  });

});
