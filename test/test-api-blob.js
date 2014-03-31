var request = require('request');
var http = require('http');
var api = require('../api');
var util = require('util');
var connect = require('connect');
var log = function(obj) {
    console.log("Log!");
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
        this["_"+method][this.index].call(this,req,res,this.next.bind(this));
    }
}
var router = new handler;

var server = http.createServer(function(req,res) {
    var method = req.method.toLowerCase(); //POST , GET etc
    var url = req.url;
    var x = router.emit(method,url,req,res)
});
router.get('/',function(req,res) {
});
router.post('/blob/create',connect.json(),api.blob.create);

server.listen(5050);
request.post({
    url:'http://localhost:5050/blob/create',
    json: {foo:'bar'}},
    function(err, resp, body) {
    }
);
