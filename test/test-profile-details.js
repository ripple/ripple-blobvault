var config = require('../config');
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store)
var app = express();
var api = require('../api');
api.setStore(store);

var testutils = require('./utils');
var request = require('request');
var response = require('response')

app.use(express.json());
app.use(express.urlencoded());

app.post('/v1/user/:username/profile', api.user.profile);


var server = http.createServer(app)
var assert = require('chai').assert

var QL = require('queuelib')
var q = new QL;


test('test-profile-details',function(done) {
    q.series([
    function(lib) {
        server.listen(5150,function() {
           lib.done() 
        })
    },
    function(lib) {
        testutils.person.id = testutils.person.blob_id;
        delete testutils.person.blob_id;
        delete testutils.person.date;
        delete testutils.person.password;
        delete testutils.person.secret;
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
        request.post({url:'http://localhost:5150/v1/user/'+testutils.person.username + '/profile',
        json: {country:'US',phone:'555-555-1212'}}
        ,function(err,resp,body) {
            assert.equal(body.result,'success')
            lib.done()
        })
    },
    function(lib) {
        store.db('blob')
        .where('username','=',testutils.person.username)
        .select()
        .then(function(resp) {
            var row = resp[0];
            assert.equal(row.phone,'555-555-1212')
            assert.equal(row.country,'US')
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
