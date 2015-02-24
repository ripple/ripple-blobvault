var config = require('../config');
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store)
var app = express();
var api = require('../api');
var request = require('request');
var response = require('response')
var assert = require('chai').assert;
api.setStore(store);

var util = require('util');

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test Profile Details', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    app.use(express.json());
    app.use(express.urlencoded());

    app.post('/v1/user/:username/profile', api.user.profile);

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

    testPerson.id = testPerson.blob_id;
    delete testPerson.blob_id;
    delete testPerson.date;
    delete testPerson.password;
    delete testPerson.secret;

    store.db('blob')
    .insert(testPerson)
    .then(function() {
      done();
    });
  });

  test('Post to profile', function(done) {
    request.post({url:'http://localhost:5050/v1/user/'+testPerson.username + '/profile',
    json: {country:'US',phone:'555-555-1212'}}
    ,function(err,resp,body) {
      assert.equal(body.result,'success')
      done();
    });
  });

  test('Validate profile', function(done) {
    store.db('blob')
    .where('username','=',testPerson.username)
    .select()
    .then(function(resp) {
      var row = resp[0];
      assert.equal(row.phone,'555-555-1212');
      assert.equal(row.country,'US');
      done();
    });
  });

});
