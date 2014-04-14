var config = require('../config');
var http = require('http');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var hmac = require('../lib/hmac');
var api = require('../api');

var testutils = require('./utils');
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

console.log("testUtils. sig:");

var sig = testutils.createSignature({method:'DELETE',url:'/v1/user',secret:testutils.person.auth_secret,date:'april'});
console.log(sig);

q.series([
    function(lib) {
        var url = 'http://localhost:5050/v1/user?signature=' + sig + '&signature_date=april&signature_blob_id='+ testutils.person.blob_id;
        console.log("Url:" + url);

        request.del({
            url:url,
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
