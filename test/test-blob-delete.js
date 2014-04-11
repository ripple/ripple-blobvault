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

app.post('/v1/blob/delete', hmac.middleware, api.blob.delete);
var server = http.createServer(app);
server.listen(5050);

var GLOBALS = {
    revision : 0
};
q.series([
// needs blob_id and patch
    function(lib) {
        request.post({
            url:'http://localhost:5050/v1/blob/delete?signature=98fd04e5f28ed20e5484d6b07e7c8e0779f81419e4700675d73ee3d1db16518155da273e1c66ab1910f3ca79785a5588881642c23d9201cb9133f73c7b6aa85f&signature_date=april&signature_blob_id=ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',
            json:{
                data:'new data blob',
                revision : GLOBALS.revision,
                blob_id:'ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a'
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
