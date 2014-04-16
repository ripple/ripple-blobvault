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

app.get('/v1/blob/:blob_id', api.blob.get);
var server = http.createServer(app);
server.listen(5050);

q.series([
    function(lib) {
        request.get({
            url:'http://localhost:5050/v1/blob/ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a'
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
            url:'http://localhost:5050/v1/blob/ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0b'
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
            url:'http://localhost:5050/v1/blob/sdf'
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                lib.done();
        });
    }
]);
