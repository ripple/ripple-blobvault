var config = require('../config');
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store)
var app = express();
var testutils = require('./utils');
var request = require('request');
var response = require('response')
var assert = require('chai').assert;

var reflector = function(req,res) {
    response.json({foo:'bar'}).pipe(res)
}

var util = require('util');

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test Guard Requests', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    app.use(express.json());
    app.use(express.urlencoded());

    app.delete('/v1/user', guard.locked,reflector);
    app.post('/v1/blob/patch', guard.locked,reflector);
    app.post('/v1/blob/consolidate', guard.locked,reflector);
    app.get('/v1/locked', guard.locked,reflector);

    server = http.createServer(app);

    store.db('blob')
    .truncate()
    .then(function() {
      return store.db('campaigns')
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

  test('Insert campaign', function(done) {
    var obj = {
      address:testPerson.address,
      last_emailed:1400762460231,
      start_time:1400762460219,
      campaign:'fund-name',
      isFunded:false,
      locked:'30 day not funded'
    };
    store.db('campaigns')
    .insert(obj)
    .then(function(resp) {
      done();
    });
  });

  test('Confirm locked', function(done) {
    request({
      url:'http://localhost:5050/v1/locked?address='+testPerson.address,
      json:true
    },
    function(err,resp,body) {
      assert.equal(resp.statusCode,403,'status should be 403 forbidden');
      assert.equal(body.result,'locked','result should be locked');
      done();
    });
  });

  test('Check after unlocked', function(done) {
    store.db('campaigns')
    .update({locked:''})
    .then(function(resp) {
      request({url:'http://localhost:5050/v1/locked?address='+testPerson.address,
      json:true},
      function(err,resp,body) {
        assert.equal(body.foo,'bar','reflector should be passed through');
        done();
      });
    });
  });

  test('Invalid id should pass through', function(done) {
    request.post({url:'http://localhost:5050/v1/blob/patch',
      json:{
        blob_id:'asdf'
      }
    },
    function(err,resp,body) {
      assert.equal(body.foo,'bar','reflector should be passed through');
      done();
    });
  });

  test('Valid id should pass through', function(done) {
    request.post({url:'http://localhost:5050/v1/blob/patch',
      json:{
        blob_id:testPerson.id
      }
    },
    function(err,resp,body) {
      assert.equal(body.foo,'bar','reflector should be passed through');
      done();
    });
  });

});
