var config = require('../config');
var http = require('http');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var hmac = require('../lib/hmac');
var api = require('../api');
var testutils = require('./utils');
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


var testutils = require('./utils');

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

var server = http.createServer(app);
server.listen(5050);

var assert = require('chai').assert;
test('create , patch, patch, delete', function(done) {
    q.series([
        function(lib) {
            server.listen(5050,function() {
                lib.done();
            });
        },
        // create user
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: testutils.person
            },
            function(err, resp, body) {
                assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                log(body);
                lib.done();
            }
        );
        },
        // do the patch
        function(lib) {
            var body = { patch : "foo", blob_id:testutils.person.blob_id }; // req.body = { patch : 'foo' }
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    console.log("The response");
                    log(err);
                    log(resp.statusCode);
                    assert.deepEqual(body,{result:'success',revision:1});
                    log(body);
                    lib.done();
            });
        },
        // do another patch
        function(lib) {
            var body = { patch : "bar", blob_id:testutils.person.blob_id  }; // req.body = { patch : 'bar' }
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                console.log("The response");
                    log(err);
                    log(resp.statusCode);
                    log(body);
                    assert.deepEqual(body,{result:'success',revision:2});
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
