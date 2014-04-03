var request = require('request');
var http = require('http');
var api = require('../api');
var util = require('util');
var queuelib = require('queuelib');
var jsonbody = require('./jsonbody');
var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth:1 }));
}


var express = require('express');
var app = express();
var server = http.createServer(app);
app.use(express.json());
app.use(express.urlencoded());
app.get('/user/verify/:token', api.user.verify);
app.post('/blob/create', api.blob.create);
app.get('/user/:username',api.user.get);
server.listen(5050);

q.series([
    function(lib) {
    request.get({
        url:'http://localhost:5050/user/bob',
        json:true
        },
        function(err, resp, body) {
            log(body);
            lib.done();
        }
    );
    },
    function(lib) {
    request.post({
        url:'http://localhost:5050/blob/create',
        json: { 
        username : 'bob',
        auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
        data : 'foo' ,
        address : 'r24242',
        email: 'bob@foo.com'
        }},
        function(err, resp, body) {
            log(body);
            lib.done();
        }
    );
    },
    function(lib) {
    request.get({
        url:'http://localhost:5050/user/bob',
        json:true
        },
        function(err, resp, body) {
            log(body);
            lib.done();
        }
    );
    }
]);
