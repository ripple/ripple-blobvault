console.log(__filename);
var config = require('../config');
var http = require('http');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var hmac = require('../lib/hmac');
var api = require('../api');
var request = require('request');
var assert = require('chai').assert;
api.setStore(store);
hmac.setStore(store);

var util = require('util');
var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test User Get', function() {

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
      return store.db('blob_patches')
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
  test('Create user', function(done) {
    request.post({
      url: 'http://localhost:5050/v1/user?' +
        'signature_account='  + testPerson.address +
        '&signature_blob_id=' + testPerson.blob_id,
      json: testPerson
    }, function(err, resp, body) {
      assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
      done();
    });
  });

  test('Get user by username', function(done) {
    request.get({
      url: 'http://localhost:5050/v1/user/'+testPerson.username
    },function(err, resp, body) {
      assert.equal(resp.statusCode,200,'newly created user GET should have statuscode 200');
      done();
    });
  });

  test('Get user by ripple address', function(done) {
    request.get({
      url : 'http://localhost:5050/v1/user/'+testPerson.address
    },function(err, resp, body) {
      assert.equal(resp.statusCode,200,'newly created user GET by ripple address should have statuscode 200');
      done();
    });
  });

  test('Get invalid user by non-existant username', function(done) {
    request.get({
      url  : 'http://localhost:5050/v1/user/abob5051',
      json : true
    },function(err, resp, body) {
      assert.equal(body.exists,false,'this user should not exist');
      done();
    });
  });

  test('Get invalid user by non-existant username again', function(done) {
    request.get({
      url  : 'http://localhost:5050/v1/user/r24242asdfe0fe0fe0fea0sfesfjke',
      json : true
    },function(err, resp, body) {
      assert.equal(body.exists, false,'this user should not exist');
      done();
    });
  });

  test('Get invalid user by non-existant address', function(done) {
    request.get({
      url  : 'http://localhost:5050/v1/user/FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
      json : true
    },function(err, resp, body) {
      assert.equal(body.exists, false,'this user should not exist');
      done();
    });
  });

});
