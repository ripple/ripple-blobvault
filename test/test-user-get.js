console.log(__filename);
var config = require('../config');
var http = require('http');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var hmac = require('../lib/hmac');
var api = require('../api');
var request = require('request');
api.setStore(store);
hmac.setStore(store);

var util = require('util');
var queuelib = require('queuelib');
var q = new queuelib;
var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var app = express();
app.use(express.json());
app.use(express.urlencoded());

app.delete('/v1/user',hmac.middleware, api.blob.delete);
app.post('/v1/user',api.blob.create);
app.get('/v1/user/:username', api.user.get);
var server = http.createServer(app);
var testutils = require('./utils');
var assert = require('chai').assert;
test('create, get, the cleanup and delete', function(done) {
    q.series([
        function(lib) {
            server.listen(5050,function() {
                console.log("SERVER CREATED");
                lib.done();
            });
        },
        // create the user first
        function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: testutils.person
                }, function(err, resp, body) {
                    console.log(err);
                    console.log(body);
                    assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                    lib.done();
            });
        },
        // should work
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/'+testutils.person.username
            },function(err, resp, body) {
                    assert.equal(resp.statusCode,200,'newly created user GET should have statuscode 200');
                    lib.done();
            });
        },
        // should work
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/'+testutils.person.address
            },function(err, resp, body) {
                    assert.equal(resp.statusCode,200,'newly created user GET by ripple address should have statuscode 200');
                    lib.done();
            });
        },
        // should fail, but we return 200 anyways since we check for exist : false
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/bob5051',
                json: true 
            },function(err, resp, body) {
                assert.equal(body.exists,false,'this user should not exist');
                lib.done();
            });
        },
        // should fail
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/r24242asdfe0fe0fe0fea0sfesfjke',
                json:true
            },function(err, resp, body) {
                    assert.equal(body.exists, false,'this user should not exist');
                    lib.done();
            });
        },
        // should fail
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                json : true
            },function(err, resp, body) {
                    assert.equal(body.exists, false,'this user should not exist');
                    lib.done();
            });
        },
        // delete user after 
        function(lib) {
            var sig = testutils.createSignature({method:'DELETE',url:'/v1/user',secret:testutils.person.auth_secret,date:testutils.person.date});
            var url = 'http://localhost:5050/v1/user?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.del({
                url:url,
                json:true
            },function(err, resp, body) {
                assert.equal(resp.statusCode,200,'after delete request, status code should be 200');
                lib.done();
            });
        },
        function(lib) {
            server.close(function() {
                lib.done();
                done();
            });
        }
    ]);
});
