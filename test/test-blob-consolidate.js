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
app.post('/v1/blob/patch', hmac.middleware, api.blob.patch);
app.post('/v1/blob/consolidate', hmac.middleware, api.blob.consolidate);
var server = http.createServer(app);
server.listen(5050);

var GLOBALS = {
    revision : 0
};
q.series([
    function(lib) {
        request.get({
            url:'http://localhost:5050/v1/blob/ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',
            json: true
        }, function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                GLOBALS.revision = body.patches.length;
                lib.done();
        });
    },
// needs blob_id and patch
    function(lib) {
        request.post({
            url:'http://localhost:5050/v1/blob/consolidate?signature=6d6b6663e54457084a67f847b53e2d3b185977ac5e91bdd449e86ed96445812373199bb68ad7a1ed64b59fb9a665ba4c237d798273c8ecc1940993a03323f546&signature_date=april&signature_blob_id=ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',
            json:{
                blob_id:'ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',    
                data:'new data blob',
                revision : GLOBALS.revision
            }
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                lib.done();
        });
    }
]);
