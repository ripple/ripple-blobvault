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

var server = http.createServer(app);
      
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
        console.log(err, body);
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
        done();
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
        done();
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
            given  : 'matthew',
            family : 'fettig',
          },
          ssn_last_4 : '0000',
          birthdate  : '1985-01-01',  
          address  : {
            line1       : "1236 Fake St.",
            locality    : "San Francisco",
            region      : "CA",
            postal_code : "94709",
            country     : "US"
          }
        }
      };

      var response = { 
        id: '541631e13261310002ab0300',
        status: 'valid',
        details: { 
          address: 'no_match',
          address_risk: 'low',
          identification: 'no_match',
          date_of_birth: 'not_found',
          ofac: 'no_match',
          pep: 'no_match' 
        },
      };
      
      nock('https://api.blockscore.com/')
        .post('/verifications')
        .reply(200, response, {'Content-Type': 'text/plain'}); 
             
      request.post({url:'http://localhost:5150/v1/attestation/profile/update?signature_blob_id='+testutils.person.id,json:options}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'valid'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        done();
      });      
    });
    
    it('should return a profile attestation if it exists', function(done) {
      request.post({url:'http://localhost:5150/v1/attestation/profile?signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'valid'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.blinded, 'string'); 
        done();
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
        assert.strictEqual(typeof body.attestation, 'string'); 
        assert.strictEqual(typeof body.questions, 'object'); 
        done();
      });
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
        done();
      });      
    });
    
    it('should return an identity attestation if it exists', function(done) {
      request.post({url:'http://localhost:5150/v1/attestation/identity?signature_blob_id='+testutils.person.id,json:true}, function(err,resp,body) {
        console.log(err, body);
        assert.ifError(err);  
        assert.strictEqual(body.result, 'success');
        assert.strictEqual(body.status, 'verified'); 
        assert.strictEqual(typeof body.attestation, 'string'); 
        done();
      });
    });    
  });  
});