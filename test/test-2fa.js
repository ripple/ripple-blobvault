var config = require('../config');
var reporter = require('../lib/reporter')
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var libutils = require('../lib/utils')
var request = require('request');
var response = require('response')
var api = require('../api');
var assert = require('chai').assert;
api.setStore(store);

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var server = null;
var app = express();
var testutils = require('./utils');
var testPerson = JSON.parse(JSON.stringify(testutils.person));

suite('Test 2fa', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {

    app.use(express.json());
    app.use(express.urlencoded());

    app.get('/v1/blob/:blob_id', api.blob.get);
    app.post('/v1/blob/:blob_id/2fa', api.user.set2fa)
    app.get('/v1/blob/:blob_id/2fa', api.user.get2fa)
    app.get('/v1/blob/:blob_id/2fa/requestToken', api.user.request2faToken)
    app.post('/v1/blob/:blob_id/2fa/verifyToken', api.user.verify2faToken)

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
  test('create user', function(done) {

    testPerson.id = testPerson.blob_id;
    delete testPerson.blob_id;
    delete testPerson.date;
    delete testPerson.password;
    delete testPerson.secret;

    testPerson.phone_verified = true;
    testPerson.email = 'unit-test@ripple.com';

    store.db('blob')
    .insert(testPerson)
    .then(function() {
      done()
    })

  });

  test('Set 2fa', function(done) {
    request.post({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa?signature_blob_id='+testPerson.id,json:{
      phone : testPerson.phone,
      country_code:'1'
    }},function(err,resp, body) {
      assert.equal(body.result,'success');
      done();
    });
  });


  test('Fail 2fa enabled until phone verified', function(done) {
    request.post({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa?signature_blob_id='+testPerson.id,json:{
      enabled : true
    }},function(err,resp, body) {
      assert.deepEqual(body,{ result: 'error',message:'enabled cannot be set if phone number is not verified' });
      done();
    });
  });

  test('Get 2fa settings for user', function(done) {
    request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa?signature_blob_id='+testPerson.id,json:true},
    function(err,resp, body) {
      assert.deepEqual(body, { country_code:'1',
        enabled: false,
        masked_phone: '******'.concat(testPerson.phone.substr(-4)),
        phone:libutils.normalizePhone(testPerson.phone),
        result:'success', auth_id:testPerson["2fa_auth_id"]
      });
      done();
    });
  });

  test('Get 2fa request token', function(done) {
    request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa/requestToken',json:true},function(err,resp,body) {
      console.log("request response body:",body);
      done()
    });
  });

  test('Verify a token', function(done) {
    request.post({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa/verifyToken',json:{device_id:'a1a2a3a4a5', token:'0000000',remember_me:false}},function(err,resp,body) {
      assert.deepEqual(body, {result:'success'});
      request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa/requestToken',qs:{force_sms:true},json:true},function(err,resp,body) {
        assert.deepEqual(body, {result:'success', via: 'sms'});
        done();
      });

    });
  });

  test('Request with invalid device_id and 2fa disabled', function(done) {
    request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=c1c2c3c4c5',json:true},function(err,resp,body) {
      assert.ok(body.blob && body.encrypted_secret)
      done()
    })
  });

  test('Request with valid devide_id and 2fa disabled', function(done) {
    request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
      assert.ok(body.blob && body.encrypted_secret)
      done()
    })
  });

  test('Invalidate device_id and request with 2fa disabled', function(done) {
    store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{is_auth:false},table:'twofactor'}, function() {
      request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
        assert.ok(body.result == 'success');
        assert.ok(body.blob && body.encrypted_secret);
        done();
      });
    })
  });

  test('Enable 2fa on blob', function(done) {
    request.post({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa?signature_blob_id='+testPerson.id,json:{
      enabled : true,
    }},function(err,resp, body) {
      request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'/2fa?signature_blob_id='+testPerson.id,json:true},
      function(err,resp, body) {
        assert.ok(body.enabled === true);
        done();
      })
    });
  });

  test('Request with invalid device_id and 2fa enabled', function(done) {
    request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=c1c2c3c4c5',json:true},function(err,resp,body) {
      assert.equal(body.result,'error');
      assert.equal(body.message,'Two factor auth enabled but no auth result for that device id');
      done();
    });
  });

  test('Validate device_id and request with 2fa enabled', function(done) {
    store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{is_auth:true},table:'twofactor'}, function() {
      request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
        assert.ok(body.blob && (body.result == 'success'));
        done();
      })
    });
  });

  test('Request with no device_id and 2fa enabled', function(done) {
    request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id,json:true},function(err,resp,body) {
      assert.equal(body.result, 'error');
      assert.equal(body.message, 'Two factor auth required. No device id supplied');
      done();
    });
  });

  test('Request with expired device_id, 25 hours not remembered', function(done) {
    var back = new Date().getTime() - (25*3600*1000);
    store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{remember_me:false,is_auth:true,last_auth_timestamp:back},table:'twofactor'}, function() {
      request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
        assert.equal(body.result, 'error');
        assert.equal(body.message, 'Two factor auth enabled but device is not authorized');
        done();
      });
    });
  });

  test('Request with expired device_id, 31 days remembered', function(done) {
    var back = new Date().getTime() - (31*24*3600*1000);
    store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{remember_me:true,is_auth:true,last_auth_timestamp:back},table:'twofactor'}, function() {
      request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
        assert.equal(body.result, 'error');
        assert.equal(body.message, 'Two factor auth enabled but device is not authorized');
        done();
      });
    });
  });

  test('Request with remembered device_id, 15 days old', function(done) {
    var back = new Date().getTime() - (15*24*3600*1000);
    store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{remember_me:true,is_auth:true,last_auth_timestamp:back},table:'twofactor'}, function() {
      request.get({url:'http://localhost:5050/v1/blob/'+testPerson.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
        assert.equal(body.result,'success');
        assert.ok(body.blob);
        done();
      });
    });
  });

});
