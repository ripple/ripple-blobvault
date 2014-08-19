var config = require('../config');
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var app = express();
var api = require('../api');
api.setStore(store);

var testutils = require('./utils');
var request = require('request');
var response = require('response')

app.use(express.json());
app.use(express.urlencoded());

app.post('/v1/profile/:identity_id', api.user.setProfile)
app.get('/v1/profile/:identity_id', api.user.getProfile)

var server = http.createServer(app)
var assert = require('chai').assert

var QL = require('queuelib')
var q = new QL;


var attr_a = {
    name:'phone',
    type:'work',
    value:'555-NUM-FIRST'}
var attr_b = {
    name:'email',
    type:'personal',
    value:'foo@bar.com'}


var addr_a = {
    type:'home',
    line1:'555 Park',
    postal_code:5555,
    country:'USA'
}
   
var attr_list = [attr_a,attr_b]
var addr_list = [addr_a]

    q.series([
    function(lib) {
        server.listen(5150,function() {
           lib.done() 
        })
    },
    function(lib) {
        request.post({url:'http://localhost:5150/v1/profile/1234',
        json: {attributes:attr_list}},
        function(err,resp,body) {
            console.log(body)
            lib.done()
        })
    },
    function(lib) {
        request.post({url:'http://localhost:5150/v1/profile/1234',
        json: {addresses:addr_list}},
        function(err,resp,body) {
            console.log(body)
            lib.done()
        })
    },
    function(lib) {
        request.get({url:'http://localhost:5150/v1/profile/1234',
        json:true},
        function(err, resp, body) {
            console.log(body)
            lib.done()
        })
    }
    ])
