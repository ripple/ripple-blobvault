console.log(__filename);
var config = require('../config');
var http = require('http');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var hmac = require('../lib/hmac');
var api = require('../api');
var libutils = require('../lib/utils');
var request = require('request');
var assert = require('chai').assert;
api.setStore(store);
hmac.setStore(store);

var util = require('util');

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test Quota', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    app.use(express.json());
    app.use(express.urlencoded());

    // create
    app.post('/v1/user', api.blob.create);
    // patch
    app.post('/v1/blob/patch', hmac.middleware, api.blob.patch);
    // delete
    app.delete('/v1/user', hmac.middleware, api.blob.delete);
    // get
    app.get('/v1/blob/:blob_id', api.blob.get);
    // get specific
    app.get('/v1/blob/:blob_id/patch/:patch_id', api.blob.getPatch);
    // consolidate
    app.post('/v1/blob/consolidate', hmac.middleware, api.blob.consolidate);

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
  test('create user', function(done) {
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

  test('500 patches of 3 bytes', function(done) {
    this.timeout(0);

    var count = 0;
    var converted = libutils.btoa('foo');
    var doPatch = function() {
      var body = { patch : converted, blob_id:testPerson.blob_id };
      var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testPerson.auth_secret,date:testPerson.date,body:body});
      var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
      request.post({url:url,json:body},function(err, resp, body) {
        count++;
        assert.deepEqual(body,{result:'success',revision:count});
        if (count < 500) {
          doPatch();
        } else {
          store.read_where({key:'id',value:testPerson.blob_id},function(resp) {
            var row = resp[0];
            assert.equal(500*3+3,row.quota,'quota should be equal to 500*3+3');
            done();
          });
        }
      });
    };
    doPatch();
  });

  test('Quota exceeded at 1523 patches', function(done) {
    this.timeout(0);

    // so far we have used up 1500 bytes out of a total 1024*1000
    // we should be able to go another 999 patches, and the 1000'th
    // should be a quota error
    var count = 500;
    var largestring = libutils.rs((config.patchsize*1024));
    var converted = libutils.btoa(largestring)
    var doPatch = function() {
      var body = { patch : converted, blob_id:testPerson.blob_id };
      var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testPerson.auth_secret,date:testPerson.date,body:body});
      var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
      request.post({url:url,json:body},function(err, resp, body) {
        count++;

        if (count <= 1523) {
          assert.deepEqual(body,{result:'success',revision:count});
        } else {
          assert.deepEqual(body,{result:'error',code:6682,message:'quota exceeded'});
        }
        if (count <= 1530) {
          doPatch();
        } else {
          done();
        }
      });
    };
    doPatch();

  });

  test('Delete user', function(done) {
    var sig = testutils.createSignature({method:'DELETE',url:'/v1/user',secret:testPerson.auth_secret,date:testPerson.date});
    var url = 'http://localhost:5050/v1/user?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
    request.del({
      url:url,
      json:true
    },function(err, resp, body) {
      assert.equal(resp.statusCode,200,'after delete request, status code should be 200');
      done();
    });
  });

});
