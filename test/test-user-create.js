var request = require('request');
var http = require('http');
var api = require('../api');
var config = require('../config');
var store = require('../lib/store')(config.dbtype);
api.setStore(store);
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

var server = http.createServer(app);
app.post('/v1/user',api.blob.create);

server.listen(5050);

q.series([
    function(lib) {
    request.post({
        url:'http://localhost:5050/v1/user',
        json: {foo:'bar'}},
        function(err, resp, body) {
            log(err);
            log(resp.statusCode);
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
        json: testutils.person
        },
        function(err, resp, body) {
            log(resp.statusCode);
            log(resp.headers);
            log(body);
            lib.done();
        }
    );
    },
    function(lib) {
        lib.done();
    }
]);
