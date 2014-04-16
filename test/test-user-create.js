var request = require('request');
var http = require('http');
var api = require('../api');
var hmac = require('../lib/hmac');
var config = require('../config');
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

var server = http.createServer(app);
server.listen(5050);

var assert = require('chai').assert;
test('create then delete',function(done) {
    q.series([
        function(lib) {
            server.listen(5050,function() {
                lib.done();
            });
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: {foo:'bar'}},
            function(err, resp, body) {
                log(err);
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { blob_id :'bar'}},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'b',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'bb--',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'bb--bb',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'bob',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'bob',
            auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'bob',
            auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
            data : 'foo' 
            }},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'bob',
            auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
            data : 'foo' ,
            address : 'r24242'
            }},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: { 
            username : 'bob',
            auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
            blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
            data : 'foo' ,
            address : 'r24242',
            email: 'bob@foo.com'
            }},
            function(err, resp, body) {
                log(body);
                lib.done();
            }
        );
        },
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
