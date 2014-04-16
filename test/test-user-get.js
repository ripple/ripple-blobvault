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
server.listen(5050);

var testutils = require('./utils');
var assert = require('chai').assert;

test('create, get, the cleanup and delete', function(done) {
    q.series([
        // create the user first
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: testutils.person
            },
            function(err, resp, body) {
                log(arguments);
                assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                lib.done();
            }
        );
        },
        // should work
        function(lib) {
            console.log("Getting user " + testutils.person.username);
            request.get({
                url:'http://localhost:5050/v1/user/'+testutils.person.username
            },function(err, resp, body) {
                    console.log("The get user response " + testutils.person.username + " response");
                    log(err);
                    log(body); 
                    log(resp.statusCode);
                    assert.equal(resp.statusCode,200,'newly created user GET should have statuscode 200');
                    log(body);
                    lib.done();
            });
        },
        // should work
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/r24242asdfe0fe0fe0fea0sfesfjkej'
            },function(err, resp, body) {
                console.log("The response");
                    log(err);
                    log(resp.statusCode);
                    log(body);
                    lib.done();
            });
        },
        // should fail
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/bob5051'
            },function(err, resp, body) {
                console.log("The response");
                    log(err);
                    log(resp.statusCode);
                    log(body);
                    lib.done();
            });
        },
        // should fail
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/r24242asdfe0fe0fe0fea0sfesfjke'
            },function(err, resp, body) {
                console.log("The response");
                    log(err);
                    log(resp.statusCode);
                    log(body);
                    lib.done();
            });
        },
        // should fail
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'
            },function(err, resp, body) {
                console.log("The response");
                    log(err);
                    log(resp.statusCode);
                    log(body);
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
                console.log("The response");
                log(err);
                log(resp.statusCode);
                assert.equal(resp.statusCode,200,'after delete request, status code should be 200');
                log(body);
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
