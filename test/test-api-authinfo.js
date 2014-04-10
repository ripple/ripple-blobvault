var request = require('request');
var http = require('http');
var api = require('../api');
var config = require('../config');
var store = require('../lib/store')(config.dbtype);
api.setStore(store);
var util = require('util');
var queuelib = require('queuelib');
var express = require('express');
var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var app = express();

app.use(express.json());
app.use(express.urlencoded());

var server = http.createServer(app);
app.get('/v1/authinfo', api.user.authinfo);

server.listen(5050);

q.series([
    function(lib) {
        request.get({
            url:'http://localhost:5050/v1/authinfo?username=rob'
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                lib.done();
        });
    }, 
    function(lib) {
        request.get({
            url:'http://localhost:5050/v1/authinfo?uername=rob'
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                lib.done();
        });
    }, 
    function(lib) {
        request.get({
            url:'http://localhost:5050/v1/authinfo?username='
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                lib.done();
        });
    }, 
    function(lib) {
        request.get({
            url:'http://localhost:5050/v1/authinfo?username=bob'
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                lib.done();
        });
    } 
]);
