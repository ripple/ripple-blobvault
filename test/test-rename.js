console.log(__filename);
var config = require('../config');
var Hash = require('hashish');
var request = require('request');
var http = require('http');
var api = require('../api');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store)
var util = require('util');
var cors = require('cors')
var express = require('express');
var testutils = require('./utils');
var assert = require('chai').assert;

api.setStore(store);

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test User Rename', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded());

    app.post('/v1/user/:username',guard.locked,api.user.rename);

    server = http.createServer(app);

    store.db('blob')
    .truncate()
    .then(function() {
      testPerson.id = testPerson.blob_id;
      delete testPerson.blob_id;
      delete testPerson.date;
      delete testPerson.password;
      delete testPerson.secret;

      return store.db('blob')
      .insert(testPerson);
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
  test('Cannot rename a non-existant user', function(done) {
    request.post({
      url : 'http://localhost:5050/v1/user/foo?' +
      '&signature_blob_id=' + testPerson.id,
      json : {
        encrypted_secret : testPerson.encrypted_secret,
        data:testPerson.data,
        revision:1,
        blob_id:'35435a',
        username:'bob2'
      }
    },function(err,resp,body) {
      console.log(err, body);
      assert.equal(resp.statusCode,400)
      assert.equal(body.result,'error')
      assert.equal(body.message,'invalid user')
      done()
    })
  });

  test('should rename existing user', function(done) {
    request.post({
      url : 'http://localhost:5050/v1/user/'+testPerson.username + '?' +
        '&signature_blob_id=' + testPerson.id,
      json:{
        encrypted_secret : testPerson.encrypted_secret,
        data:testPerson.data,
        revision:1,
        blob_id:'35435a',
        username:'bob2'
      }
    }, function(err,resp,body) {
        console.log(err, body);
        assert.equal(resp.statusCode,200);
        assert.equal(body.result,'success');

        store.db('blob')
        .where('username','=','bob2')
        .select()
        .then(function(resp) {
            assert.equal('35435a',resp[0].id)
            assert.equal('bob2',resp[0].username)
            done()
        });
    })
  });

});
