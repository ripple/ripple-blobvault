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

app.post('/v1/blob/patch', hmac.middleware, api.blob.patch);
var server = http.createServer(app);
server.listen(5050);

q.series([
// needs blob_id and patch
    function(lib) {
        request.post({
            url:'http://localhost:5050/v1/blob/patch/',
            json:{
                blob_id:'ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',    
                patch : "cat"
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
