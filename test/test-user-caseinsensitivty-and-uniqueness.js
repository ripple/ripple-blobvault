console.log(__filename);
var config = require('../config');
var request = require('request');
var http = require('http');
var api = require('../api');
var hmac = require('../lib/hmac');
var store = require('../lib/store')(config.dbtype);
api.setStore(store);
hmac.setStore(store);
var util = require('util');

var queuelib = require('queuelib');
var express = require('express');
var testutils = require('./utils');
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

var assert = require('chai').assert;
test('test case insensitive lookup',function(done) {
    q.series([
        function(lib) {
            server.listen(5050,function() {
                console.log("SERVER CREATED");
                lib.done();
            });
        },
        // first we create user bob5050
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: testutils.person
            },
            function(err, resp, body) {
                log(resp.statusCode);
                assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                log(resp.headers);
                log(body);
                lib.done();
            }
        );
        },
        // next we perform case-insensitive lookup
        function(lib) {
        var capitalize = function (string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
        var casedUsername = capitalize(testutils.person.username);
        console.log("testutils.person.username:", testutils.person.username); 
        console.log("casedUsername            :", casedUsername); 
        request.get({
            url:'http://localhost:5050/v1/user/'+casedUsername,
            json: true
            },
            function(err, resp, body) {
                log(resp.statusCode);
                assert.equal(resp.statusCode,200,'after case insensitive lookup, status code should be 200');
                log(resp.headers);
                log(body);
                lib.done();
            }
        );
        },
        // next we create user Bob5050, which should fail
        function(lib) {
            console.log("next we create user Bob5050, which should fail");
            var capitalize = function (string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }
            var casedUsername = capitalize(testutils.person.username);
            testutils.person.username = casedUsername;
            request.post({
                url:'http://localhost:5050/v1/user',
                json: testutils.person
                },
                function(err, resp, body) {
                    log(resp.statusCode);
                    assert.equal(resp.statusCode,400,' we should guarantee case-insensitive uniqueness however on user creation');
                    assert.equal(body.result, 'error',' there should be an error on creating a user with a username that has a case insensitive equality to another user');
                    log(resp.headers);
                    log(body);
                    lib.done();
                }
            );
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
