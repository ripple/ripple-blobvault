var http = require('http');
var testutils = require('./utils');
var libutils = require('../lib/utils');
var request = require('request');
var util = require('util');
var queuelib = require('queuelib');
var q = new queuelib;
var assert = require('chai').assert;

var testutils = require('./utils');
q.series([
    // create user
    function(lib) {
        request.post(
        { url:'http://localhost:8080/v1/user',
        json: testutils.person
        },
        function(err, resp, body) {
            assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
            lib.done();
        });
    }
]);
