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
var lib = require('../lib');
var ecdsa = require('../lib/ecdsa');
var guard = require('../guard')(store) 
var limiter = guard.resend_email();
var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var app = express();

app.use(function(req,res,next) {
    next();
});
app.use(express.json());
app.use(express.urlencoded());

app.post('/v1/user/email', ecdsa.middleware, api.user.emailChange);
app.post('/v1/user/email/resend', limiter.check, api.user.emailResend);
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
                lib.set({old_email:testutils.person.email})
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
                assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                lib.done();
            }
        );
        },
        // change email address
        function(lib) {
        request.post({
            url:'http://localhost:5050/v1/user/email',
            json: {email:'bit@bit.com',blob_id:testutils.person.blob_id, hostlink:'asdf', username:testutils.person.username} 
            },
            function(err, resp, body) {
                console.log("Changed email address:", body)
                lib.done();
            }
        );
        },
        // inspect it 
        function(lib) {
            store.read_where({key:'id',value:testutils.person.blob_id},function(rows) {
                console.log(rows);
                if (rows.length) {
                    var email = rows[0].email;
                    assert.equal(email,'bit@bit.com');
                }
                lib.done();
            });
        },
        // request resend
        function(lib) {
            console.log("Beginning start of resend request");
            request.post({
                url:'http://localhost:5050/v1/user/email/resend',
                json: {email:'bit@bit.com',hostlink:'asdf', username:testutils.person.username} 
                },
                function(err, resp, body) {
                    console.log("requested resend", body)
                    lib.done();
                }
            );
        },
        // request resend #2
        function(lib) {
            console.log("Beginning start of resend request");
            request.post({
                url:'http://localhost:5050/v1/user/email/resend',
                json: {email:'bit@bit.com',hostlink:'asdf', username:testutils.person.username} 
                },
                function(err, resp, body) {
                    console.log("requested resend", body)
                    lib.done();
                }
            );
        },
        // request resend #3
        function(lib) {
            console.log("Beginning start of resend request");
            request.post({
                url:'http://localhost:5050/v1/user/email/resend',
                json: {email:'bit@bit.com',hostlink:'asdf', username:testutils.person.username} 
                },
                function(err, resp, body) {
                    console.log("requested resend", body)
                    lib.done();
                }
            );
        },
        // request resend #4
        function(lib) {
            console.log("Beginning start of resend request");
            request.post({
                url:'http://localhost:5050/v1/user/email/resend',
                json: {email:'bit@bit.com',hostlink:'asdf', username:testutils.person.username} 
                },
                function(err, resp, body) {
                    console.log("requested resend", body)
                    lib.done();
                }
            );
        },
        // request resend #5
        function(lib) {
            console.log("Beginning start of resend request");
            request.post({
                url:'http://localhost:5050/v1/user/email/resend',
                json: {email:'bit@bit.com',hostlink:'asdf', username:testutils.person.username} 
                },
                function(err, resp, body) {
                    console.log("requested resend", body)
                    lib.done();
                }
            );
        },
        // request resend #6
        function(lib) {
            console.log("Beginning start of resend request");
            request.post({
                url:'http://localhost:5050/v1/user/email/resend',
                json: {email:'bit@bit.com',hostlink:'asdf', username:testutils.person.username} 
                },
                function(err, resp, body) {
                    console.log("requested resend", body)
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
})
