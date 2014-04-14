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

app.delete('/v1/user', hmac.middleware, api.blob.delete);
var server = http.createServer(app);
server.listen(5050);

var GLOBALS = {
    revision : 0
};
q.series([
    function(lib) {
        request.del({
            url:'http://localhost:5050/v1/user?signature=ac7788e688e511884947ca9953523bfadbd6f3a9d895cdce524d9b2d90f09fc7b2a36f90a87e94565ec775d1830682ae882b95308a4a4bafac6e9805bdecd3a3&signature_date=april&signature_blob_id=ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',
            json:true
        },function(err, resp, body) {
            console.log("The response");
                log(err);
                log(resp.statusCode);
                log(body);
                lib.done();
        });
    }
]);
