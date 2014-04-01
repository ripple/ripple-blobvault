var request = require('request');
var http = require('http');
var api = require('../api');
var util = require('util');
var queuelib = require('queuelib');
var jsonbody = require('./jsonbody');
var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}
var handler = function() {
    this.get = function() {
        var args = [].concat.apply({},arguments).slice(1);
        var type = args[0]; 
        this._get = args.slice(1);
    }
    this.post = function() {
        var args = [].concat.apply({},arguments).slice(1);
        var type = args[0]; 
        this._post = args.slice(1);
    }
    this.index = 0;
    this.method;
    this.next = function() {
        if (this.index < this["_"+this.method].length - 1) {
            this.index++
            this["_"+this.method][this.index].call(this,this.req,this.res,this.next.bind(this));
        } 
    }
    this.req; this.res;
    this.emit = function(method,url,req,res) {
        this.method = method;
        this.req = req; this.res = res;
        this.index = 0;
        this["_"+method][this.index].call(this,req,res,this.next.bind(this));
    }
}
var router = new handler;

var server = http.createServer(function(req,res) {
    var method = req.method.toLowerCase(); //POST , GET etc
    var url = req.url;
    var x = router.emit(method,url,req,res)
});
router.get('/blob/read',function(req,res) {});
router.post('/blob/create', jsonbody(),api.blob.create);
server.listen(5050);

q.series([
    function(lib) {
    request.post({
        url:'http://localhost:5050/blob/create',
        json: {foo:'bar'}},
        function(err, resp, body) {
            log(body);
            lib.done();
        }
    );
    },
    function(lib) {
    request.post({
        url:'http://localhost:5050/blob/create',
        json: { blob_id :'bar'}},
        function(err, resp, body) {
            log(body);
            lib.done();
        }
    );
    },
    function(lib) {
    request.post({
        url:'http://localhost:5050/blob/create',
        json: { blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
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
        username : 'b',
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
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
        username : 'bb--',
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
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
        username : 'bb--bb',
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
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
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
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
        blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
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
        data : 'foo' 
        }},
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
        address : 'r24242'
        }},
        function(err, resp, body) {
            console.log("request cb... body");
            log(body);
            lib.done();
        }
    );
    }
]);
