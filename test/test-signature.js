console.log(__filename);
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


var assert = require('chai').assert;
test('create , patch, patch, get specific patch #2, delete', function(done) {
    var server = http.createServer(app);
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
                lib.done();
            }
        );
        },
        // do the patch but with a bad signature
        function(lib) {
            var body = { patch : "foo", blob_id:testutils.person.blob_id }; // req.body = { patch : 'foo' }
            var sig = 'foobar';
            var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    assert.equal(resp.statusCode,401,'status code should be incorrect, 401 response');
                    lib.done();
            });
        },
        // do the patch but with missing patch information
        function(lib) {
            var body = { blob_id:testutils.person.blob_id };
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    assert.equal(resp.statusCode,400, 'should be errored, we did not include patch');
                    assert.equal(body.missing.patch,true,'we should be missing patch information');
                    lib.done();
            });
        },
        // do the patch but with missing blob_id information
        function(lib) {
            var body = { patch : "foo" }; // req.body = { patch : 'foo' }
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    assert.equal(resp.statusCode,400, 'should be errored, we did not include patch');
                    assert.equal(body.missing.blob_id,true,'we should be missing patch information');
                    lib.done();
            });
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
                    assert.deepEqual(body,{result:'success',revision:1});
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
                    assert.deepEqual(body,{result:'success',revision:2});
                    lib.done();
            });
        },
        // Get patch #2 
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/blob/'+testutils.person.blob_id+'/patch/2',
                json:true
            },function(err, resp, body) {
                    assert.equal(body.result,'success','we should be able to retreive patch 2');
                    lib.done();
            });
        },
        // Consolidate patches
        function(lib) {
            var body = { data : "foo and bar", revision: 3, blob_id:testutils.person.blob_id  }; 
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/consolidate',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/consolidate?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    assert.equal(body.result,'success','we should be able to consolidate patches 1 and 2 into 3');
                    lib.done();
            });
        },
        // Check that blob is now at revision 3 and there are 0 patches since they were 
        // consolidated 
        function(lib) {
            request.get({
                url:'http://localhost:5050/v1/blob/'+testutils.person.blob_id,
                json:true
            },function(err, resp, body) {
                    assert.equal(body.revision, 3, 'revision should be equal to 3');
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
