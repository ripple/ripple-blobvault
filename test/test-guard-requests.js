var config = require('../config');
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store)
var app = express();
var testutils = require('./utils');
var request = require('request');
var response = require('response')

app.use(express.json());
app.use(express.urlencoded());

var reflector = function(req,res) {
    response.json({foo:'bar'}).pipe(res)
}
app.delete('/v1/user', guard.locked,reflector);
app.post('/v1/blob/patch', guard.locked,reflector);
app.post('/v1/blob/consolidate', guard.locked,reflector);
app.get('/v1/locked', guard.locked,reflector);
var server = http.createServer(app)
var assert = require('chai').assert

var QL = require('queuelib')
var q = new QL;

// the way these tests work is that the endpoint is ended with a "reflector"
// to see if we get through the guard middleware

test('test-locked-through-middleware',function(done) {
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
        store.db('campaigns')
        .truncate()
        .then(function() {
            var obj = {address:testutils.person.address,
            last_emailed:1400762460231,
            start_time:1400762460219,
            campaign:'fund-name',
            isFunded:false,
            locked:'30 day not funded'}
            lib.set({obj:obj})
            lib.done()
        })
    },
    function(lib) {
        store.db('campaigns')
        .insert(lib.get('obj'))
        .then(function(resp) {
            lib.done()
        })
    },
    function(lib) {
        request({url:'http://localhost:5150/v1/locked?address='+testutils.person.address,
        json:true},
        function(err,resp,body) {
            assert.equal(resp.statusCode,403,'status should be 403 forbidden')
            assert.equal(body.result,'locked','result should be locked')
            lib.done()
        })
    },
    function(lib) {
        store.db('campaigns')
        .update({locked:''})
        .then(function(resp) {
            lib.done()
        })
    },
    function(lib) {
        request({url:'http://localhost:5150/v1/locked?address='+testutils.person.address,
        json:true},
        function(err,resp,body) {
            assert.equal(body.foo,'bar','reflector should be passed through')
            lib.done()
        })
    },
    function(lib) {
        // we let invalid id pass through the guard
        request.post({url:'http://localhost:5150/v1/blob/patch',
        json:{
            blob_id:'asdf'
        }},
        function(err,resp,body) {
            assert.equal(body.foo,'bar','reflector should be passed through')
            lib.done()
            done()
        })
    },
    function(lib) {
        request.post({url:'http://localhost:5150/v1/blob/patch',
        json:{
            blob_id:testutils.person.id
        }},
        function(err,resp,body) {
            assert.equal(body.foo,'bar','reflector should be passed through')
            lib.done()
            done()
        })
    }
    ])
})
