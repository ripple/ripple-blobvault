var config = require('../config');
var reporter = require('../lib/reporter')
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);

var api = require('../api');
api.setStore(store);

var app = express();

var testutils = require('./utils');
var libutils = require('../lib/utils')
var request = require('request');
var response = require('response')

app.use(express.json());
app.use(express.urlencoded());

app.get('/v1/blob/:blob_id', api.blob.get);
app.post('/v1/blob/:blob_id/2fa', api.user.set2fa)
app.get('/v1/blob/:blob_id/2fa', api.user.get2fa)
app.get('/v1/blob/:blob_id/2fa/requestToken', api.user.request2faToken)
app.post('/v1/blob/:blob_id/2fa/verifyToken', api.user.verify2faToken)

var server = http.createServer(app)
var assert = require('chai').assert

var QL = require('queuelib')
var q = new QL;

// the way these tests work is that the endpoint is ended with a "reflector"
// to see if we get through the guard middleware

test('test-2fa',function(done) {
    this.timeout(0)
    q.series([
    function(lib) {
        server.listen(5150,function() {
           lib.done() 
        })
    },
    function(lib) {
        testutils.person.id = testutils.person.blob_id;
        delete testutils.person.blob_id
        delete testutils.person.date
        testutils.person.phone_verified = true
        testutils.person.email = 'rook2pawn@gmail.com'
        store.db('blob')
        .truncate()
        .then(function() {
            return store.db('blob')
            .insert(testutils.person)
        })
        .then(function() {
            lib.done()
        })
    },
    function(lib) {
        store.db('twofactor')
        .truncate()
        .then(function() {
            lib.done()
        })
    },
    // this is to set the settings for 2fa for this user
    function(lib) {
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:{
            phone : testutils.person.phone,
            country_code:'1',
            via : "sms"
        }},function(err,resp, body) {
            console.log("settings response:",body)
            assert.equal(body.result,'success')
            lib.done()
        });
    },
    // this is to set the settings for 2fa for this user
    // we want this to fail because we should not be able to enable until we have verified
    function(lib) {
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:{
            enabled : true,
            country_code:'1',
            via : "sms"
        }},function(err,resp, body) {
            console.log("settings response:",body)
            assert.deepEqual(body,{ result: 'error',message:'enabled cannot be set if phone number is not verified' })
            lib.done()
        });
    },
    // this is to get / view the settings for 2fa for this user
    function(lib) {
        console.log("Going to get the settings")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:true},
        function(err,resp, body) {
            console.log(resp.headers,resp.statusCode)
            console.log("THe BODY:", body, "  <-")
            assert.deepEqual(body, { via: 'sms',
    country_code:'1',
  enabled: false,
  masked_phone: '******'.concat(testutils.person.phone.substr(-4)),
  phone:libutils.normalizePhone(testutils.person.phone),
  result:'success', auth_id:testutils.person["2fa_auth_id"]})
            lib.done();
        })
    },
    function(lib) {
        // we should NOT be able to enable
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:{
            enabled : true,
        }},function(err,resp, body) {
            assert.deepEqual(body,{ result: 'error',
  message: 'enabled cannot be set if phone number is not verified' })
            lib.done()
        });
    },
    function(lib) {
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa/requestToken',json:true},function(err,resp,body) {
            console.log("request response body:",body)
            lib.done()
        })
    },
// this is to verify a token
    function(lib) {
        console.log("going to verify")
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa/verifyToken',json:{device_id:'a1a2a3a4a5', token:'0000000',remember_me:false}},function(err,resp,body) {
            console.log(body)
            assert.deepEqual(body, {result:'success'})
            lib.done()
        })
    },
    function(lib) {
        console.log("forcing sms request")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa/requestToken',qs:{force_sms:true},json:true},function(err,resp,body) {
            console.log("request response body:",body)
            assert.deepEqual(body, {result:'success', via: 'sms'})
            lib.done()
        })
    },
    function(lib) {
        reporter.log("make blob get request with an invalid device id, since 2fa not enabled we should still retrieve")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=c1c2c3c4c5',json:true},function(err,resp,body) {
            assert.ok(body.blob && body.encrypted_secret)
            lib.done()
        })
    }, 
    // check that twofactor response is had on blobGet for attempted validated device_id
    function(lib) {
        reporter.log("make blob get request with an valid device id, since 2fa not enabled we should still retrieve")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
            assert.ok(body.blob && body.encrypted_secret)
            lib.done()
        })
    }, 
    // now force invalid token by manually invalidating the device_id to false on twofactor table
    function(lib) {
        store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{is_auth:false},table:'twofactor'}, function() {
            lib.done()
        })
    },
    // and then attempt to get the blob
    function(lib) {
        reporter.log("check that we can still retrieve blob even with invalidated deviceId auth as long as 2fa is disabled")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
            console.log(body);
            assert.ok(body.result == 'success')
            assert.ok(body.blob && body.encrypted_secret)
            lib.done()
        })
    },
    function(lib) {
        reporter.log("now enable 2fa")
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:{
            enabled : true,
        }},function(err,resp, body) {
            lib.done()
        });
    },
    function(lib) {
        reporter.log("check that 2fa is enabled")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:true},
        function(err,resp, body) {
            assert.ok(body.enabled === true)
            lib.done();
        })
    },
    function(lib) {
        reporter.log("request blob but with invalid device id. since 2fa is enabled, it should be refused")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=c1c2c3c4c5',json:true},function(err,resp,body) {
            console.log(body)
            assert.equal(body.result,'error')
            assert.equal(body.message,'Two factor auth enabled but no auth result for that device id')
            lib.done()
        })
    },
    // now we revert the invalid auth change back to isAuth on a1a2a3a4a5
    function(lib) {
        store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{is_auth:true},table:'twofactor'}, function() {
            lib.done()
        })
    },
    function(lib) {
        reporter.log("request blob but with valid device id. since 2fa is enabled, it should be accepted")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
            assert.ok(body.blob && (body.result == 'success'))
            lib.done()
        })
    },
    function(lib) {
        reporter.log("request blob but with NO device id. since 2fa is enabled, get error")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id,json:true},function(err,resp,body) {
            console.log(body)
            assert.equal(body.result, 'error')
            assert.equal(body.message, 'Two factor auth required. No device id supplied')
            lib.done()
        })
    },
    function(lib) {
        reporter.log("Setting last auth time 25 hours ago remember me false")
        var back = new Date().getTime() - (25*3600*1000);
        store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{remember_me:false,is_auth:true,last_auth_timestamp:back},table:'twofactor'}, function() {
            lib.done()
        })
    },
    function(lib) {
        reporter.log("request blob but with valid device id. since 2fa is enabled, it should be accepted BUT remember me is false AND last auth time is > 24 hours so no blob")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
            console.log(body)
            assert.equal(body.result, 'error')
            assert.equal(body.message, 'Two factor auth enabled but device is not authorized')
            lib.done()
        })
    },
    function(lib) {
        reporter.log("Setting last auth time 31 days ago remember me true")
        var back = new Date().getTime() - (31*24*3600*1000);
        store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{remember_me:true,is_auth:true,last_auth_timestamp:back},table:'twofactor'}, function() {
            lib.done()
        })
    },
    function(lib) {
        reporter.log("request blob but with valid device id. since 2fa is enabled, it should be accepted BUT remember me is true AND last auth time is > 30 days so no blob")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
            console.log(body)
            assert.equal(body.result, 'error')
            assert.equal(body.message, 'Two factor auth enabled but device is not authorized')
            lib.done()
        })
    },
    function(lib) {
        reporter.log("Setting last auth time 15 days ago remember me true")
        var back = new Date().getTime() - (15*24*3600*1000);
        store.update_where({where:{key:'device_id', value:'a1a2a3a4a5'},set:{remember_me:true,is_auth:true,last_auth_timestamp:back},table:'twofactor'}, function() {
            lib.done()
        })
    },
    function(lib) {
        reporter.log("request blob but with valid device id. since 2fa is enabled, it should be accepted .. remember me is true AND last auth time is within 30 days specifically 15 days so we retrieve")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
            console.log(body)
            assert.equal(body.result,'success')
            assert.ok(body.blob)
            lib.done()
            done()
        })
    }
    ])
})
