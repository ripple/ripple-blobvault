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
app.get('/v1/user/:username',api.user.get);
app.get('/v1/user/:username/verify/:token',api.user.verify);
app.post('/v1/blob/create',api.blob.create);
server.listen(5050);
q.series([
    // create the user
    function(lib) {
    request.post({
        url:'http://localhost:5050/v1/blob/create',
        json: { 
        username : 'bob',
        auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
        data : 'foo' ,
        address : 'r24242993999fadsf9939f9assfdf',
        email: 'bob@foo.com'
        }},
        function(err, resp, body) {
            log(body);
            lib.done();
        }
    );
    },
    // see the user
    function(lib) {
    request.get({
        url:'http://localhost:5050/v1/user/bob',
        json:true
        },
        function(err, resp, body) {
            log(resp.headers);
            log(body);
            lib.done();
        }
    );
    },
    function(lib) {
    request.get({
        url:'http://localhost:5050/v1/user/bob/verify/05bb0cff-3b93-40f3-bf50-35c2e9d3da3b',
        json:true
        },
        function(err, resp, body) {
            log(resp.headers);
            log(body);
            lib.done();
        }
    );
    }
]);
