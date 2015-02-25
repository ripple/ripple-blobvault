console.log(__filename);
var config = require('../config');
var request = require('request');
var http = require('http');
var api = require('../api');
var hmac = require('../lib/hmac');
var store = require('../lib/store')(config.dbtype);
var util = require('util');
var assert = require('chai').assert;
var express = require('express');

api.setStore(store);
hmac.setStore(store);

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test Case Sensitivity', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    app.use(express.json());
    app.use(express.urlencoded());

    app.delete('/v1/user',hmac.middleware, api.blob.delete);
    app.post('/v1/user',api.blob.create);
    app.get('/v1/user/:username', api.user.get);

    server = http.createServer(app);

    store.db('blob')
    .truncate()
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
  test('Create User', function(done) {
    request.post({
      url:'http://localhost:5050/v1/user?' +
'signature_account='  + testPerson.address +
'&signature_blob_id=' + testPerson.blob_id,
      json: testPerson
      },
      function(err, resp, body) {
        assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
        done();
      }
    );
  });

  test('Case insensitive lookup', function(done) {
    var capitalize = function (string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    var casedUsername = capitalize(testPerson.username);
    request.get({
      url:'http://localhost:5050/v1/user/'+casedUsername,
      json: true
    },
    function(err, resp, body) {
      assert.equal(resp.statusCode,200,'after case insensitive lookup, status code should be 200');
      done();
    });
  });

  test('Create case insensitive user exists', function(done) {
    var capitalize = function (string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    var casedUsername = capitalize(testPerson.username);
    testPerson.username = casedUsername;
    request.post({
      url:'http://localhost:5050/v1/user',
      json: testPerson
    },
    function(err, resp, body) {
      assert.equal(resp.statusCode,400,' we should guarantee case-insensitive uniqueness however on user creation');
      assert.equal(body.result, 'error',' there should be an error on creating a user with a username that has a case insensitive equality to another user');
      done();
    });
  });

});
