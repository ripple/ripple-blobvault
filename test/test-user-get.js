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

app.post('/v1/user',api.blob.create);
app.get('/v1/user/:username', api.user.get);
var server = http.createServer(app);
server.listen(5050);


q.series([
    function(lib) {
    request.post({
        url:'http://localhost:5050/v1/user',
        json: { 
        username : 'bob5050',
        auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
        data : 'foo' ,
        address : 'r24242asdfe0fe0fe0fea0sfesfjkej',
        email: 'bob5050@bob.com'
        }},
        function(err, resp, body) {
            log(resp.statusCode);
            log(resp.headers);
            log(body);
            lib.done();
        }
    );
    },
    // should work
    function(lib) {
        request.get({
            url:'http://localhost:5050/v1/user/bob5050'
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
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
    }
]);
