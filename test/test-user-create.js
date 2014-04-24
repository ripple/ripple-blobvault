console.log(__filename);
var config = require('../config');
var Hash = require('hashish');
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


var assert = require('chai').assert;
test('create then delete',function(done) {
    var server = http.createServer(app);
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
        var mod_person = Hash(testutils.person).clone.end;
        delete mod_person.encrypted_secret;
        request.post({
            url:'http://localhost:5050/v1/user',
            json: mod_person
            },
            function(err, resp, body) {
                console.log(body);
                assert.equal(resp.statusCode,400,'encrypted secret is required');
                assert.equal(body.result,'error');
                assert.equal(body.message,'No encrypted secret provided.');
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
                assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
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
                assert.equal(resp.statusCode,400,'we should not be able to duplicate a user that already exists');
                log(body);
                lib.done();
            }
        );
        },
        // here we are going to modify the username but violate the constraint on the unique ripple address 
        // we want to .catch from the store since it should be throwing at the db level
        
        // step 1 modify the testutils.person.username 
        function(lib) {
            var mod_person = Hash(testutils.person).clone.end;
            mod_person.username = 'zed';
        request.post({
            url:'http://localhost:5050/v1/user',
            json: mod_person
            },
            function(err, resp, body) {
                assert.equal(resp.statusCode,400,'we should not be create a new person with the same ripple address');
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
