var config = require('../config');
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var api = require('../api');
api.setStore(store);
var app = express();
var testutils = require('./utils');
var request = require('request');
var response = require('response')

app.use(express.json());
app.use(express.urlencoded());

app.get('/v1/user/recov/:username', api.user.recov);
var server = http.createServer(app)
var assert = require('chai').assert

var QL = require('queuelib')
var q = new QL;


test('test-recov',function(done) {
    q.series([
    function(lib) {
        server.listen(5150,function() {
           lib.done() 
        })
    },
    function(lib) {
        testutils.person.id = testutils.person.blob_id;
        delete testutils.person.blob_id
        delete testutils.person.date
        store.db('blob')
        .truncate()
        .then(function() {
            return store.db('blob')
            .insert(testutils.person)
        })
        .then(function() {
            lib.done()
        })
    },
    function(lib) {
        request({url:'http://localhost:5150/v1/user/recov/'+testutils.person.username,
        json:true},
        function(err,resp,body) {
            console.log(body);
            lib.done()
            done()
        })
    },
    function(lib) {
      server.close(function() {
        lib.done();
      });
    }
    ])
})
