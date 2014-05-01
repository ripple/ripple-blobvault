console.log(__filename);
var config = require('../config');
var http = require('http');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var hmac = require('../lib/hmac');
var api = require('../api');
var testutils = require('./utils');
var libutils = require('../lib/utils');
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
        // do the patch but not valid base 64
        function(lib) {
            var body = { patch : 'foo', blob_id:testutils.person.blob_id }; // req.body = { patch : 'foo' }
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    assert.deepEqual(body,{result:'error',message:'patch is not valid base64'});
                    lib.done();
            });
        },
        // do the patch but make it too big s.t. patch.length > 1kb
        function(lib) {
            var largestring = libutils.rs((config.patchsize*1024)+4);
            var body = { patch : libutils.btoa(largestring), blob_id:testutils.person.blob_id }; // req.body = { patch : 'foo' }
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    assert.deepEqual(body,{result:'error',message:'patch size > 1kb', size:largestring.length})
                    lib.done();
            });
        },
        // do the patch
        function(lib) {
            var body = { patch : libutils.btoa('foo'), blob_id:testutils.person.blob_id }; // req.body = { patch : 'foo' }
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
            var body = { patch : libutils.btoa("bar"), blob_id:testutils.person.blob_id  }; // req.body = { patch : 'bar' }
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
// we can skip this test since express 3.x.x delegates limits to raw-body , which has a default of 1mb limit 
/*
        // Consolidate patches but data too large (over 1mb)
        function(lib) {
            var largestring = libutils.rs(1e6+4);
            var body = { data : libutils.btoa(largestring), revision: 3, blob_id:testutils.person.blob_id  }; 
            var sig = testutils.createSignature({method:'POST',url:'/v1/blob/consolidate',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
            var url = 'http://localhost:5050/v1/blob/consolidate?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
            request.post({
                url:url,
                json:body
            },function(err, resp, body) {
                    console.log(resp.headers);
                    console.log(body);
                    assert.deepEqual(body,{result:'error',message:'data > 1e6 bytes', size:largestring.length})
                    lib.done();
            });
        },
*/
        // Consolidate patches
        function(lib) {
            var body = { data : libutils.btoa("foo and bar"), revision: 3, blob_id:testutils.person.blob_id  }; 
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
                    console.log(body);
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
