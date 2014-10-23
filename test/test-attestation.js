var config = require('../config');
var reporter = require('../lib/reporter');
var http = require('http');
var https = require('https');
var express = require('express');
var store = require('../lib/store')(config.dbtype);
var hmac = require('../lib/hmac');
var blobIdentity = require('../lib/blobIdentity');
var assert = require('chai').assert;
var api = require('../api');
var nock = require('nock');
var jwt = require('jsonwebtoken');
var base64Url = require('base64-url');
var fs  = require('fs');
var key = fs.readFileSync('./public.pem');

console.log(config);

api.setStore(store);
blobIdentity.setStore(store);

var app = express();

var testutils = require('./utils');
var libutils = require('../lib/utils')
var request = require('request');
var response = require('response')

app.use(express.json());
app.use(express.urlencoded());

app.post('/v1/attestation/phone', blobIdentity.getID, api.attestation.phone.get);
app.post('/v1/attestation/phone/update', blobIdentity.getID, api.attestation.phone.update);
app.post('/v1/attestation/profile', blobIdentity.getID, api.attestation.profile.get);
app.post('/v1/attestation/profile/update', blobIdentity.getID, api.attestation.profile.update);
app.post('/v1/attestation/identity', blobIdentity.getID, api.attestation.identity.get);
app.post('/v1/attestation/identity/update', blobIdentity.getID, api.attestation.identity.update);
app.get('/v1/attestation/summary', blobIdentity.getID, api.attestation.summary.get);

var server = http.createServer(app);
 
var blockscoreResponse = {
  "id": "51f5b51f8fcf0e4d59000001",
  "created_at": 1403762295,
  "updated_at": 1403762295,
  "status": "valid",
  "livemode": false,
  "date_of_birth": "1980-08-23",
  "phone_number": null,
  "ip_address": null,
  "identification": {
    "ssn": "0000"
  },
  "details": {
      "address": "mismatch",
      "address_risk": "low",
      "identification": "match",
      "date_of_birth": "match",
      "ofac": "not_found"
  },
  "name": {
      "first": "John",
      "middle": "Pearce",
      "last": "Doe"
  },
  "address": {
      "street1": "1 Infinite Loop",
      "street2": "Apt 6",
      "city": "Cupertino",
      "state": "CA",
      "postal_code": "95014",
      "country_code": "US"
  }
};



describe('Attestation:', function() {

  before(function(done) {
    server.listen(5150, function() {
      testutils.person.id = testutils.person.blob_id;
      delete testutils.person.blob_id;
      delete testutils.person.date;
      testutils.person.phone_verified = true;
      testutils.person.email = 'rook2pawn@gmail.com';
  
      store.db('blob')
      .truncate()
      .then(function() {
          return store.db('blob')
          .insert(testutils.person)
      })
      .then(function() {
          done()
      });     
    });  
  });
  
  describe('Phone attestation:', function() {
    it('should resopond with an error if no phone attestation exists', function(done) {
      var params = {
        phone : {
          number : testutils.person.phone,
          country_code : '1'
        }
      };
      
      request.post({url:'http://localhost:5150/v1/attestation/phone?signature_blob_id='+testutils.person.id,json:params}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result,  'error'); 
        done();
      });
    });

    it('should create a pending attestation for a new phone', function(done) {
      var params = {
        phone : {
          number : testutils.person.phone,
          country_code : '1'
        }
      };

      nock(config.phone.url)
        .filteringPath(/(protected\/json\/phones\/verification\/start(.+))/g, 'start/')
        .post('/start/')
        .reply(200, {success:true}, {'Content-Type': 'text/plain'}); 
        
      request.post({url:'http://localhost:5150/v1/attestation/phone/update?signature_blob_id='+testutils.person.id,json:params}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success'); 
        assert.strictEqual(body.status, 'pending'); 
        done();
      });
    });      
      
    it('should respond with an error if the token is invalid', function(done) {
      var params = {
        phone : {
          number : testutils.person.phone,
          country_code : '1',
        },
        token : "zzzz"
      };

      nock(config.phone.url)
        .filteringPath(/protected\/json\/phones\/verification\/check(.+)/g, 'check/')
        .get('/check/')
        .reply(200, {success:false}, {'Content-Type': 'text/plain'}); 
        
      request.post({url:'http://localhost:5150/v1/attestation/phone/update?signature_blob_id='+testutils.person.id,json:params}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'error'); 
        done();
      });
    });
    
    it('should create a verified attestation if the token is valid', function(done) {
      var params = {
        phone : {
          number : testutils.person.phone,
          country_code : '1',
        },
        token : "0000000"
      };

      nock(config.phone.url)
        .filteringPath(/protected\/json\/phones\/verification\/check(.+)/g, 'check/')
        .get('/check/')
        .reply(200, {success:true}, {'Content-Type': 'text/plain'}); 
              
      request.post({url:'http://localhost:5150/v1/attestation/phone/update?signature_blob_id='+testutils.person.id,json:params}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          
          validAttestation(body.blinded, function(err, payload) {
            assert.ifError(err); 
            assert.strictEqual(typeof payload, 'object'); 
            done();
          });
        });
      });
    });
    
    it('should return a phone attestation if it exists', function(done) {
      var params = {
        phone : {
          number : testutils.person.phone,
          country_code : '1'
        }
      };
      
      request.post({url:'http://localhost:5150/v1/attestation/phone?signature_blob_id='+testutils.person.id,json:params}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result,  'success');
        assert.strictEqual(body.status, 'verified');
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          
          validAttestation(body.blinded, function(err, payload) {
            assert.ifError(err); 
            assert.strictEqual(typeof payload, 'object'); 
            done();
          });
        });
      });
    });          
  });
  
  describe('Profile attestation:', function() {
    it('should return an error if no profile attestation exists', function(done) {
      request.post({url:'http://localhost:5150/v1/attestation/profile?signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result,  'error'); 
        done();
      });
    });
    it('should create a valid profile attestation for a valid profile', function(done){
      
      var options = {
        type : 'profile',
        profile : {
          name : {
            given  : blockscoreResponse.name.first,
            family : blockscoreResponse.name.last,
            middle : blockscoreResponse.name.middle,
          },
          ssn_last_4 : blockscoreResponse.identification.ssn,
          birthdate  : blockscoreResponse.date_of_birth,  
          address : {
            line1       : blockscoreResponse.address.street1,
            line2       : blockscoreResponse.address.street2,
            locality    : blockscoreResponse.address.city,
            region      : blockscoreResponse.address.state,
            postal_code : blockscoreResponse.address.postal_code,
            country     : blockscoreResponse.address.country_code
          }
        }
      };
      
      nock('https://api.blockscore.com/')
        .post('/verifications')
        .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 
             
      request.post({url:'http://localhost:5150/v1/attestation/profile/update?signature_blob_id='+testutils.person.id,json:options}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'verified'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          
          validAttestation(body.blinded, function(err, payload) {
            assert.ifError(err); 
            assert.strictEqual(typeof payload, 'object'); 
            done();
          });
        });
      });      
    });
    
    it('should return a profile attestation if it exists', function(done) {
      
      nock('https://api.blockscore.com/')
        .get('/verifications/51f5b51f8fcf0e4d59000001')
        .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 
      
      request.post({url:'http://localhost:5150/v1/attestation/profile?signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        console.log(err, body);
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'verified'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          
          validAttestation(body.blinded, function(err, payload) {
            assert.ifError(err); 
            assert.strictEqual(typeof payload, 'object'); 
            done();
          });
        });
      });
    });     
  }); 
  
  describe('Identity attestation:', function() {
    it('should return an error if no identity attestation exists', function(done) {
      request.post({url:'http://localhost:5150/v1/attestation/identity?signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result,  'error'); 
        done();
      });
    });

    it('should return a question set if a valid profile attestation exists', function(done) {
      var options = {
        type : 'identity'
      };
      
      var response = {
        id : "12345",
        questions : [{id:1,question:"who are you?",answers:[]}]  
      };
      
      nock('https://api.blockscore.com/')
        .post('/questions')
        .reply(200, response, {'Content-Type': 'text/plain'}); 
        
      request.post({url:'http://localhost:5150/v1/attestation/identity/update?signature_blob_id='+testutils.person.id,json:options}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'unverified'); 
        assert.strictEqual(typeof body.questions, 'object'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          
          validAttestation(body.blinded, function(err, payload) {
            assert.ifError(err); 
            assert.strictEqual(typeof payload, 'object'); 
            done();
          });
        });
      });
    });
    
    it('should return an error if the time the user takes more than 3 minutes to answer the questions', function (done) {
      store.getAttestations({identity_id:testutils.person.identity_id, type:'identity'}, function (resp) {
        var created = new Date().getTime() - (5 * 60 * 1000);
        var options = {
          type    : 'identity',
          answers : []
        };
          
        store.update_where({set:{created:created}, table:'attestations',where:{key:'id',value:resp[0].id}}, function(db_resp) {
          request.post({url:'http://localhost:5150/v1/attestation/identity/update?signature_blob_id='+testutils.person.id,json:options}, function(err,resp,body) { 
            assert.ifError(err);  
            assert.strictEqual(body.result,  'error'); 
            done();
          });   
        });
      })
    });
    
    it('should return an error if the user attempts to answer questions more than 4 times in 24 hours', function (done) {
      store.getAttestations({identity_id:testutils.person.identity_id, type:'identity'}, function (resp) {
        var created = new Date().getTime();
        var meta    = resp[0].meta;
        var id      = resp[0].id;
        var options = {
          type    : 'identity',
          answers : []
        };
        
        meta.attempts = [created-86000000, created-8000000, created-80000, created];
          
        store.update_where({set:{meta:meta, created:created}, table:'attestations',where:{key:'id',value:id}}, function(db_resp) {
          request.post({url:'http://localhost:5150/v1/attestation/identity/update?signature_blob_id='+testutils.person.id,json:options}, function(err,resp,body) { 
            assert.ifError(err);  
            assert.strictEqual(body.result,  'error'); 
            
            //reset so the next test passes
            meta.attempts = [];
            store.update_where({set:{meta:meta}, table:'attestations',where:{key:'id',value:id}}, function(db_resp) {
              done();
            });
          });   
        });
      })
    });    
    
    it('should return a verified identity attestation given correctly answered questions', function(done) {
      var options = {
        type : 'identity',
        answers : [
          {
            question_id : 1,
            answer_id   : 5
          }, {
            question_id : 2,
            answer_id   : 2
          }]
      };
      
      var response = {
        id : "12345",
        score : 100  
      };      

      nock('https://api.blockscore.com/')
        .post('/questions/score')
        .reply(200, response, {'Content-Type': 'text/plain'}); 
                   
      request.post({url:'http://localhost:5150/v1/attestation/identity/update?signature_blob_id='+testutils.person.id,json:options}, function(err,resp,body) { 
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'verified'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          
          validAttestation(body.blinded, function(err, payload) {
            assert.ifError(err); 
            assert.strictEqual(typeof payload, 'object'); 
            done();
          });
        });
      });      
    });
    
    it('should return an identity attestation if it exists', function(done) {
      request.post({url:'http://localhost:5150/v1/attestation/identity?signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'verified'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          
          validAttestation(body.blinded, function(err, payload) {
            assert.ifError(err); 
            assert.strictEqual(typeof payload, 'object'); 
            done();
          });
        });
      });
    });    
  });
  
  describe('Attestation Summary:', function() {
    it('should return a summary of all existing attestations', function(done) { 
      request.get({url:'http://localhost:5150/v1/attestation/summary?signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(typeof body.attestation, 'string'); 
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          done();
        });
      });      
    }); 

  
    it('should return a summary of all existing attestations with full details', function(done) { 
      
      nock('https://api.blockscore.com/')
        .get('/verifications/51f5b51f8fcf0e4d59000001')
        .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 
      
      request.get({url:'http://localhost:5150/v1/attestation/summary?full=true&signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        console.log(err, body);
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(typeof body.attestation, 'string'); 
        validAttestation(body.attestation, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          done();
        });
      });      
    }); 
  });  
});

var validAttestation = function (attestation, callback) {
  var segments =  attestation.split('.');
  var decoded;
  
  // base64 decode and parse JSON
  try {
    decoded = {
      header    : JSON.parse(base64Url.decode(segments[0])),
      payload   : JSON.parse(base64Url.decode(segments[1])),
      signature : segments[2]
    }; 
    
  } catch (e) {
    console.log("invalid attestation:", e);
    callback(e);
  }  
  
  jwt.verify(attestation, key, callback);
};