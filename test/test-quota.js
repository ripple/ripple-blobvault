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
    // turn off timeouts since we are doing load testing here as well
    this.timeout(0); 
    var server = http.createServer(app);
    q.series([
        function(lib) {
            store.db('blob')
            .truncate()
            .then(function() {
                lib.done()
            })
        },
        function(lib) {
            store.db('blob_patches')
            .truncate()
            .then(function() {
                lib.done()
            })
        },
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
        // do a 500 patches at 3 bytes each
        // also we are going to be checking that revisions follow
        function(lib) {
            var count = 0;
            var converted = libutils.btoa('foo');
            var doPatch = function() {
                var body = { patch : converted, blob_id:testutils.person.blob_id }; 
                var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
                var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
                request.post({url:url,json:body},function(err, resp, body) {
                    count++;
                    if ((body.revision) && (body.revision % 5 == 0))
                        console.log(body)
                    assert.deepEqual(body,{result:'success',revision:count});
                    if (count < 500)
                        doPatch();
                    else 
                        lib.done();
                });
            };
            doPatch(); 
        },
        // check that the quota is 500*3 bytes (patches) + 3 bytes (original data)
        function(lib) {
            store.read_where({key:'id',value:testutils.person.blob_id},function(resp) {
                var row = resp[0];
                assert.equal(500*3+3,row.quota,'quota should be equal to 500*3+3'); 
                lib.done();
            })
        },
        // so far we have used up 1500 bytes out of a total 1024*1000
        // we should be able to go another 999 patches, and the 1000'th
        // should be a quota error

        function(lib) {
            // note we start the count at 500 
            var count = 500;
            var largestring = libutils.rs((config.patchsize*1024));
            var converted = libutils.btoa(largestring)
            var doPatch = function() {
                var body = { patch : converted, blob_id:testutils.person.blob_id }; 
                var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
                var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
                request.post({url:url,json:body},function(err, resp, body) {
                    count++;
                    if ((body.revision) && (body.revision % 5 == 0))
                        console.log(body)
                    if (count <= 1523)
                        assert.deepEqual(body,{result:'success',revision:count});
                    else 
                        assert.deepEqual(body,{result:'error',code:6682,message:'quota exceeded'});
                    if (count <= 1530)
                        doPatch();
                    else 
                        lib.done();
                });
            };
            doPatch(); 
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
