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
var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

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
    });
  });

  test('Invalid base64 patch', function(done) {
    var body = { patch : 'foo', blob_id:testPerson.blob_id }; // req.body = { patch : 'foo' }
    var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testPerson.auth_secret,date:testPerson.date,body:body});
    var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
    request.post({
        url:url,
        json:body
    },function(err, resp, body) {
      assert.deepEqual(body,{result:'error',code:7712,message:'patch is not valid base64'});
      done();
    });
  });

  test('Patch greater than 1kb', function(done) {
    var largestring = libutils.rs((config.patchsize*1024)+4);
    var body = { patch : libutils.btoa(largestring), blob_id:testPerson.blob_id }; // req.body = { patch : 'foo' }
    var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testPerson.auth_secret,date:testPerson.date,body:body});
    var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
    request.post({
      url:url,
      json:body
    },function(err, resp, body) {
      assert.deepEqual(body,{result:'error',code:9061,message:'patch size > 1kb', size:largestring.length})
      done();
    });
  });

  test('Valid patch', function(done) {
    var body = { patch : libutils.btoa('foo'), blob_id:testPerson.blob_id }; // req.body = { patch : 'foo' }
    var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testPerson.auth_secret,date:testPerson.date,body:body});
    var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
    request.post({
      url:url,
      json:body
    },function(err, resp, body) {
      assert.deepEqual(body,{result:'success',revision:1});
      done();
    });
  });

  test('Valid second patch', function(done) {
    var body = { patch : libutils.btoa("bar"), blob_id:testPerson.blob_id  }; // req.body = { patch : 'bar' }
    var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testPerson.auth_secret,date:testPerson.date,body:body});
    var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
    request.post({
      url:url,
      json:body
    },function(err, resp, body) {
      assert.deepEqual(body,{result:'success',revision:2});
      done();
    });
  });

  test('Validate second patch', function(done) {
    request.get({
      url:'http://localhost:5050/v1/blob/'+testPerson.blob_id+'/patch/2',
      json:true
    },function(err, resp, body) {
      assert.equal(body.result,'success','we should be able to retreive patch 2');
      done();
    });
  });

  test('Consolidate patches', function(done) {
    var body = { data : libutils.btoa("foo and bar"), revision: 3, blob_id:testPerson.blob_id  };
    var sig = testutils.createSignature({method:'POST',url:'/v1/blob/consolidate',secret:testPerson.auth_secret,date:testPerson.date,body:body});
    var url = 'http://localhost:5050/v1/blob/consolidate?signature=' + sig + '&signature_date='+testPerson.date + '&signature_blob_id='+ testPerson.blob_id;
    request.post({
      url:url,
      json:body
    },function(err, resp, body) {
      assert.equal(body.result,'success','we should be able to consolidate patches 1 and 2 into 3');
      done();
    });
  });

  test('Validate blob is at revision 3', function(done) {
    request.get({
      url:'http://localhost:5050/v1/blob/'+testPerson.blob_id,
      json:true
    },function(err, resp, body) {
      assert.equal(body.revision, 3, 'revision should be equal to 3');
      done();
    });
  });

});
