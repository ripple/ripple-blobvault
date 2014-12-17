console.log(__filename);
var config    = require('../config');
var Hash      = require('hashish');
var request   = require('request');
var http      = require('http');
var store     = require('../lib/store')(config.dbtype);
var api       = require('../api');
var hmac      = require('../lib/hmac');
var ecdsa     = require('../lib/ecdsa')(store);
var util      = require('util');
var cors      = require('cors')
var assert    = require('chai').assert;
var ripple    = require('ripple-lib');
var RVC       = ripple.VaultClient;
var queuelib  = require('queuelib');
var express   = require('express');
var testutils = require('./utils');
var client    = new RVC('localhost:'+config.port);

var app = express();
var q   = new queuelib;
var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
};

api.setStore(store);
hmac.setStore(store);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

app.delete('/v1/user', hmac.middleware, api.blob.delete);
app.post('/v1/user/ecdsa', ecdsa.middleware, api.blob.create);
app.post('/v1/user', api.blob.create);
app.get('/v1/user/:username', api.user.get);
app.get('/v1/authinfo', api.user.authinfo);
app.get('/ripple.txt', function (req, res, next) {
  res.send('[authinfo_url]\r\nhttp://localhost:'+config.port+'/v1/authinfo\r\n');
});

while(!ripple.sjcl.random.isReady()) {
  ripple.sjcl.random.addEntropy(require('crypto').randomBytes(128).toString('base64')); //add entropy to seed the generator
}

test('create then delete',function(done) {
  this.timeout(10*1000); 
  var server   = http.createServer(app);
  var validUrl = 'http://localhost:'+config.port+'/v1/user?' + 
    'signature_account='  + testutils.person.address +
    '&signature_blob_id=' + testutils.person.blob_id;
  
  q.series([
    
    //clear blob table
    function(lib) {
      store.db('blob')
        .truncate()
        .then(function() {
          lib.done();
      })
    },
    
    //start the server
    function(lib) {
      server.listen(config.port,function() {
        lib.done();
      });
    },
    
    //invalid ecdsa signature
    function(lib) {
      request.post({
        url  : 'http://localhost:'+config.port+'/v1/user/ecdsa?' + 
          'signature_account='  + testutils.person.address +
          '&signature_type='    + 'ECDSA' +
          '&signature='         + 'zzzz' +
          '&signature_date='    + 'zzzz' + 
          '&signature_blob_id=' + 'zzzz',
        json : testutils.person
      }, function(err, resp, body) {
        assert.equal(resp.statusCode, 401);
        assert.strictEqual(body.result,  'error');
        assert.strictEqual(body.message, 'Unable to validate: Ripple Network error');
        assert.strictEqual(body.code,    6583);
        lib.done();
      });
    },
   
    //missing necessary keys
    function(lib) {
/* 
      var options = {
        username  : testutils.person.username,
        password  : testutils.person.password,
        masterkey : testutils.person.secret,
        domain    : 'localhost:'+config.port,
        email     : testutils.person.
      };

      client.register(options, function(err, resp) {
        console.log(err, resp);
        assert.ifError(err);
        lib.done();
      });
*/      
      
      var mod_person = Hash(testutils.person).clone.end;
      delete mod_person.encrypted_secret;
      request.post({
        url  : validUrl,
        json : mod_person
      }, function(err, resp, body) {
        console.log(resp.body);
        assert.equal(resp.statusCode,400,'encrypted secret is required');
        assert.equal(body.result,'error');
        assert.equal(body.message,'Missing keys');
        assert.ok(body.missing.encrypted_secret != undefined);
        lib.done();
      });
    },
    
    //successful create
    function(lib) {
    console.log(testutils.person);
    request.post({
      url : validUrl,
      json: testutils.person
    }, function(err, resp, body) {
      assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
      lib.done();
    });
    },
    
    //user already exists
    function(lib) {
      request.post({
        url  : validUrl,
        json : testutils.person
      }, function(err, resp, body) {
        assert.equal(resp.statusCode,400,'we should not be able to duplicate a user that already exists');
        lib.done();
      });
    },
    
    // here we are going to modify the username but violate the constraint on the unique ripple address/secret key 
    // we want to .catch from the store since it should be throwing at the db level
    // step 1 modify the testutils.person.username 
    function(lib) {
      var mod_person = Hash(testutils.person).clone.end;
      mod_person.username = 'zed';
      request.post({
        url  : validUrl,
        json : mod_person
      }, function(err, resp, body) {
        console.log(err, body);
        assert.equal(resp.statusCode,400,'we should not be create a new person with the same ripple address');
        lib.done();
      });
    },
    /*
    // insert a patch directly
    function(lib) {
      store.db('blob_patches')
      .insert({id:5, blob_id:testutils.person.blob_id, revision:55, data:'foo', size:3})
      .(function() {
        lib.done()
      })
    },
    */
    
    // delete user after 
    function(lib) {
      var sig = testutils.createSignature({
        method : 'DELETE',
        url    : '/v1/user',
        secret : testutils.person.auth_secret,
        date   : testutils.person.date
      });
      
      var url = 'http://localhost:' + config.port + '/v1/user?' + 
        'signature=' + sig + 
        '&signature_date='+testutils.person.date + 
        '&signature_blob_id='+ testutils.person.blob_id;
      
      console.log(url);
      request.del({
          url  : url,
          json : true
      }, function(err, resp, body) {
        assert.equal(resp.statusCode,200,'after delete request, status code should be 200');
        lib.done();
      });
    },
    
    function(lib) {
      server.close(function() {
        lib.done();
        done();
      });
    }
  ]);
});
