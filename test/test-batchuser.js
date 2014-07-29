console.log(__filename);
var config = require('../config');
var request = require('request');
var http = require('http');
var api = require('../api');
var store = require('../lib/store')(config.dbtype);
api.setStore(store);
var util = require('util');

var queuelib = require('queuelib');
var express = require('express');
var testutils = require('./utils');
var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var app = express();
app.use(express.json());
app.use(express.urlencoded());
app.post('/v1/lookup', api.user.batchlookup)


var server = http.createServer(app);
    q.series([
        function(lib) {
            server.listen(5050,function() {
                lib.done();
            });
        },
        function(lib) {
            testutils.person.id = testutils.person.blob_id;
            delete testutils.person.blob_id
            delete testutils.person.date
            testutils.person.phone_verified = true
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
        request.post({
            url:'http://localhost:5050/v1/lookup',
            json: {
                list:[testutils.person.address,'r256320935908as09df8s']
            }},
            function(err, resp, body) {
                console.log(body)
                lib.done();
            }
        );
        },
        function(lib) {
            server.close(function() {
                lib.done();
            });
        }
    ]);
