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
var testutils = require('./utils')
var assert = require('chai').assert;
var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var app = express();

app.use(function(req,res,next) {
    console.log("URL CALL " + req.url);
    next();
});
app.use(express.json());
app.use(express.urlencoded());

app.get('/v1/user/:username',api.user.get);
app.get('/v1/user/:username/verify/:token',api.user.verify);
app.post('/v1/user',api.blob.create);
app.delete('/v1/user',hmac.middleware, api.blob.delete);
// we just test that the token secret is created
test('email verification', function(done) {
    var server = http.createServer(app);
    var GLOBALS = {};
    q.series([
        function(lib) {
            server.listen(5050,function() {
                    console.log("SERVER CREATED");
                lib.done();
            });
        },
        // create the user
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user',
            json: testutils.person
            },
            function(err, resp, body) {
                log(resp.statusCode);
                log(resp.headers);
                console.log("BODY->", body);
                assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                lib.done();
            }
        );
        },
        function(lib) {
            store.readall({username:testutils.person.username}, function(resp) {
                if (resp.length)
                    GLOBALS.token = resp[0].email_token;
                lib.done();
            });
        },    
        function(lib) {
        request.get({
            url:'http://localhost:5050/v1/user/'+testutils.person.username+'/verify/05bb0cff-3b93-40f3-bf50-35c2e9d3da3b',
            json:true
            },
            function(err, resp, body) {
                console.log("purposeful bad verify attempt");
                log(resp.headers);
                assert.equal(body.message, 'Invalid token','token should be invalid');
                lib.done();
            }
        );
        },
        function(lib) {
        request.get({
            url:'http://localhost:5050/v1/user/x0x0x0x0x'+testutils.person.username+'/verify/05bb0cff-3b93-40f3-bf50-35c2e9d3da3b',
            json:true
            },
            function(err, resp, body) {
                console.log("purposeful bad verify attempt, non-existant user");
                log(resp.headers);
                assert.equal(body.message, 'No such user','user should not exist');
                lib.done();
            }
        );
        },
        function(lib) {
        request.get({
            url:'http://localhost:5050/v1/user/'+testutils.person.username+'/verify/'+GLOBALS.token,
            json:true
            },
            function(err, resp, body) {
                console.log("Correct token supplied");
                log(resp.headers);
                log(body);
                assert.equal(body.result, 'success','Correct token supplied');
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
})
