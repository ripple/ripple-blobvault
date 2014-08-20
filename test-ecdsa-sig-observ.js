var config = require('./config');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var store = require('./lib/store')(config.dbtype);
var hmac = require('./lib/hmac');
var ecdsa = require('./lib/ecdsa')(store);
var api = require('./api');
var reporter = require('./lib/reporter');
var guard = require('./guard')(store)
var limiter = guard.resend_email();

api.setStore(store);
hmac.setStore(store);

var app = express();
app.use(reporter.inspect);

// app.use(express.limit('1mb')); is deprecated and has no functionality
// now delegated to raw-body; has a default 1mb limit 

app.use(express.json());
app.use(express.urlencoded());

var cors = require('cors');
app.use(cors());

// JSON handlers
app.post('/v1/user', ecdsa.middleware, api.blob.create);



var server =  http.createServer(app);


var request = require('request');
var onlisten = function() {

    setInterval(function() {
        request.post({
            url:'http://localhost:5150/v1/user',
            json:{"blob_id":"7c40c2a60ed8bd3d6a162f5f56663870e39d2e083fc75b467ec6d4609e652ff8","username":"charmander","address":"rHEtpM3ZyLhBRVST8zf7oxRyucxbzUAWtL","auth_secret":"264004aba6be05b717bd16a73eb40f9ca7a7f351bf2df1970fd22aed66d553c1","data":"AFqfHR0zG7PElzvhUDDtEL8AzfD0v9x2GioWq4x9d9Giaozrv7BR5Fqo6D5LDIUsp+X3WzdYmVN8p2zKDqD4N6yszZbVmjo6kjGPOSZKLZ9FoRJPNRdpO7KQsuh7nXNbAS82d+Z3pdWEbGSTCO0JtYL7zv4+fSX5xKBpX3kYuGHUXGJmXaC449/Wwu5JIv4PYEOIAN09VGOXGVhfVCCAGinV+qVscXBa43TcIj4UMHUxHmERNkkCrOEZOSNCU369aoU60O7ewjaEN2qQG2HY+S8WQX9QliX1p72K38cXIYWKffinSckcUyhGh6y6cg==","email":"rook2pawn@gmail.com","hostlink":"https://staging.ripple.com/client/#/register/activate","domain":"staging.ripple.com","encrypted_blobdecrypt_key":"AGAtGi+QahEQDCYP5sr1naTrpytKWjGYNjsk7O5GdUMhHhGViqi8AVNA50JdTVgr6fVB4un7pszB0Q/LNjxpMitpZQxdSbSmFS15qMrZzkV+O2J/s+Yn4Sw=","encrypted_secret":"AIW3hJuoqIcqjdzQsKFKzlw0k3lpAwh42yBLwJ9EMBmolKOJSKVslEGYdY1/P0Wv0t4gp/J/"} 
            },
            function(err, resp, body) {
                console.log("Header:", resp.headers)
                console.log("BODY:",body);
            }
        );
    },15000)
}

server.listen(5150, onlisten);
