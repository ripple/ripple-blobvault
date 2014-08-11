var config = require('../config');
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
        console.log("setting settings")
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:{
            enabled : true,
            phone : testutils.person.phone,
            country_code:'1',
            via : "sms"
        }},function(err,resp, body) {
            console.log("settings response:",body)
            assert.equal(body.result,'success')
            lib.done()
        });
    },
        // this is to get / view the settings for 2fa for this user
    function(lib) {
        console.log("Going to get the settings")
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:true},
        function(err,resp, body) {
            console.log(resp.headers,resp.statusCode)
            console.log(body)
            assert.deepEqual(body, { via: 'sms',
    country_code:'1',
  enabled: true,
  masked_phone: '******'.concat(testutils.person.phone.substr(-4)),
  phone:libutils.normalizePhone(testutils.person.phone),
  result:'success',auth_id:body.auth_id})
            lib.done();
        })
    },
    function(lib) {
        console.log("setting settings with app enabled")
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa?signature_blob_id='+testutils.person.id,json:{
            enabled : true,
            phone : testutils.person.phone,
            country_code:'1',
            via : "app"
        }},function(err,resp, body) {
            console.log("settings response:",body)
            lib.done()
        });
    },
    function(lib) {
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa/requestToken',json:true},function(err,resp,body) {
            console.log(body)
            lib.done()
        })
    },
// this is to verify a token
    function(lib) {
        console.log("going to verify")
        request.post({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'/2fa/verifyToken',json:{device_id:'a1a2a3a4a5', token:'0000000'}},function(err,resp,body) {
            console.log(body)
            lib.done()
        })
    },
/*
    // check that twofactor response is had on blobGet for attempted validated device_id
    function(lib) {
        request.get({url:'http://localhost:5150/v1/blob/'+testutils.person.id+'?device_id=a1a2a3a4a5',json:true},function(err,resp,body) {
            console.log(body);
            lib.done()
        })
    }, 
*/
    function(lib) {
        lib.done()
        done()
    }
    ])
})
