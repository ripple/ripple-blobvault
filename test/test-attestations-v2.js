var config   = require('../config');
var reporter = require('../lib/reporter');
var http     = require('http');
var https    = require('https');
var express  = require('express');
var store    = require('../lib/store')(config.dbtype);
var hmac     = require('../lib/hmac');
var blobIdentity = require('../lib/blobIdentity');
var assert   = require('chai').assert;
var api      = require('../api');
var nock     = require('nock');
var jwt      = require('jsonwebtoken');
var base64Url = require('base64-url');
var fs       = require('fs');
var key      = fs.readFileSync('./public.pem');
var attestations = require('../api/attestations');

api.setStore(store);
blobIdentity.setStore(store);

var app = express();

var testutils = require('./utils');
var libutils = require('../lib/utils')
var request = require('request');
var response = require('response')

app.use(express.json());
app.use(express.urlencoded());

app.post('/v1/attestation', blobIdentity.getID, attestations.update);
app.get('/v1/attestation', blobIdentity.getID, attestations.get);

var server = http.createServer(app);
 
var blockscoreResponse = {
  "id": "51f5b51f8fcf0e4d59000001",
  "created_at": 1403762295,
  "updated_at": 1403762295,
  "status": "invalid",
  "livemode": false,
  
  "birth_day": 1,
  "birth_month": 5,
  "birth_year": 1985,
  
  "phone_number": null,
  "ip_address": null,

  "name_first": "John",
  "name_middle": "Pearce",
  "name_last": "Doe",


  "address_street1": "1 Infinite Loop",
  "address_street2": "Apt 6",
  "address_city": "Cupertino",
  "address_subdivision": "CA",
  "address_postal_code": "95014",
  "address_country_code": "US",

  "document_type": "ssn",
  "document_value": "0000",
  
  "details": {
    "address": "mismatch",
    "address_risk": "low",
    "identification": "match",
    "date_of_birth": "match",
    "ofac": "not_found",
    "pep": 'no_match',
  },
  
   question_sets: []
};

var questionsResponse = { 
  id: '5463d5a83266390002080100',
  created_at: 1415828904,
  updated_at: 1415828904,
  livemode: false,
  person_id: '5463d5a73266390002070100',
  score: null,
  expired: false,
  time_limit: 0,
  questions: [ 
    { 
      id: 1,
      question: 'Which one of the following adult individuals is most closely associated with you?',
      answers: [ 
        { id: 1, answer: 'Nicole' },
        { id: 2, answer: 'Jose' },
        { id: 3, answer: 'Cecilia' },
        { id: 4, answer: 'Evan' },
        { id: 5, answer: 'None Of The Above' } 
      ] 
    }, { 
      id: 2,
      question: 'Which one of the following counties is associated with you?',
      answers: [ 
        { id: 1, answer: 'Sangamon' },
        { id: 2, answer: 'El Paso' },
        { id: 3, answer: 'Niagara' },
        { id: 4, answer: 'Jasper' },
        { id: 5, answer: 'None Of The Above' } 
      ] 
    }, { 
      id: 3,
      question: 'Which one of the following area codes is associated with you?',
      answers: [ 
        { id: 1, answer: '812' },
        { id: 2, answer: '308' },
        { id: 3, answer: '336' },
        { id: 4, answer: '870' },
        { id: 5, answer: 'None Of The Above' } 
      ] 
    }, { 
      id: 4,
      question: 'Which one of the following addresses is associated with you?',
      answers: [ 
        { id: 1, answer: '863 Carelton' },
        { id: 2, answer: '902 Grass Lake Rd' },
        { id: 3, answer: '221 Wolf Lake' },
        { id: 4, answer: '309 Colver Rd' },
        { id: 5, answer: 'None Of The Above' } 
      ]
    }, { 
      id: 5,
      question: 'What state was your SSN issued in?',
      answers: [ 
        { id: 1, answer: 'Oregon' },
        { id: 2, answer: 'Idaho' },
        { id: 3, answer: 'Oklahoma' },
        { id: 4, answer: 'Maine' },
        { id: 5, answer: 'None Of The Above' } 
      ] 
    }
  ]
};

var answers = [
  { question_id : 1, answer_id : 5 },
  { question_id : 2, answer_id : 4 },
  { question_id : 3, answer_id : 3 },
  { question_id : 4, answer_id : 2 },
  { question_id : 5, answer_id : 1 },
];

var answersResponse = {
  object     : 'question_set',
  id         : '5463d5a83266390002080100',
  created_at : 1415828904,
  updated_at : 1416445828,
  livemode   : false,
  person_id  : '5463d5a73266390002070100',
  score      : 20,
  expired    : false,
  time_limit : 0,
  questions  : []
};

var organizationResponse = { 
  object: 'company',
  id: '546cdf393862370002970200',
  created_at: 1416421177,
  updated_at: 1416421177,
  status: 'valid',
  livemode: false,
  entity_name: 'Ripple Labs',
  tax_id: '000000000',
  incorporation_day: 1,
  incorporation_month: 20,
  incorporation_year: 2013,
  incorporation_state: 'DE',
  incorporation_country_code: 'US',
  incorporation_type: 'corporation',
  dbas: 'opencoin',
  registration_number: null,
  email: null,
  url: null,
  phone_number: null,
  ip_address: '',
  address_street1: '1236 Fake St.',
  address_street2: null,
  address_city: 'San Francisco',
  address_subdivision: 'CA',
  address_postal_code: '94709',
  address_country_code: 'US',
  details: 
   { ofac: 'no_match',
     tax_id: 'match',
     entity_name: 'mismatch',
     state: 'match',
     address: 'no_match',
     country_code: 'match',
     incorp_date: 'no_match' 
   } 
}

var netverifyResponse = {
  "timestamp" : "2012-08-16T10:37:44.623Z",
  "jumioIdScanReference" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}

var profile = {
  name : {
    given  : 'john',
    middle : 'allen',
    family : 'doe'
  },

  id_document : {
    value   : '0001',
    type    : 'ssn',
    country : 'US',
  },

  birth_day   : 1,
  birth_month : 5,
  birth_year  : 1985,

  address  : {
    line1       : "1236 Fake St.",
    locality    : "San Francisco",
    region      : "CA",
    postal_code : "94709",
    country     : "US"
  }
};

var organizationProfile = {
  name    : 'Ripple Labs',
  aliases : 'opencoin',
  tax_id  : '000000000',

  incorporated : {
    country : 'US',
    region  : 'DE',
    type    : 'corporation',
    date : {
      day   : 1,
      month : 20,
      year  : 2013
    }  
  },

  address  : {
    line1       : "1236 Fake St.",
    locality    : "San Francisco",
    region      : "CA",
    postal_code : "94709",
    country     : "US"
  }
};

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
    return callback(e);
  }  
  
  jwt.verify(attestation, key, callback);
};


describe('Attestations v2:', function() {

  
  before(function(done) {
    server.listen(5150, function() {
      testutils.person.id = testutils.person.blob_id;
      delete testutils.person.blob_id;
      delete testutils.person.date;
      delete testutils.person.password;
      delete testutils.person.secret;
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
  
  it('should attempt to get an existing attestation', function(done) {
    
    request.get({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : true
    }, function(err,resp,body) {   
      assert.ifError(err);  
      assert.strictEqual(body.result,  'error'); 
      assert.strictEqual(body.message, 'attestation not found');
      done();
    });
  }); 
  
  it('should initiate a new attestation (person, invalid)', function(done) {

    var params = {
      type    : 'person',
      profile : profile
    };
    
    nock('https://api.blockscore.com/')
      .post('/people')
      .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'});   

    request.post({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : params
    }, function(err,resp,body) {
      assert.ifError(err);
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'incomplete');
      assert.strictEqual(typeof body.questions, 'undefined');
      assert.strictEqual(body.requirements[0], 'photo');
      assert.strictEqual(body.requirements[1], 'photo_id');
      assert.strictEqual(body.requirements[2], 'profile');
      done();
    });
  });  
  
  it('should attempt to get an existing attestation (person, invalid)', function(done) {

    nock('https://api.blockscore.com/')
      .get('/people/' + blockscoreResponse.id)
      .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 
    
    request.get({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : true
    }, function(err,resp,body) {   
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'incomplete');
      validAttestation(body.attestation, function(err, payload) {
        assert.ifError(err); 
        assert.strictEqual(typeof payload, 'object'); 
        assert.strictEqual(payload.profile_verified, false);
        assert.strictEqual(payload.identity_verified, false);
        
        validAttestation(body.blinded, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          assert.strictEqual(payload.profile_verified, false);
          assert.strictEqual(payload.identity_verified, false);
          done();
        });
      });
    });
  }); 
  
  it('should initiate a new attestation (person)', function(done) {

    profile.id_document.value = '0000';
    blockscoreResponse.status = 'valid';
    
    var params = {
      type    : 'person',
      profile : profile
    };

    nock('https://api.blockscore.com/')
      .post('/people')
      .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 

    nock('https://api.blockscore.com/')
      .post('/question_sets')
      .reply(200, questionsResponse, {'Content-Type': 'text/plain'});   

    request.post({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : params
    }, function(err,resp,body) {
      assert.ifError(err);
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'incomplete');
      assert.strictEqual(typeof body.questions, 'object');
      assert.strictEqual(body.requirements[0], 'answers');
      done();
    });
  });
  
  it('should attempt to get an existing attestation (person, incomplete)', function(done) {

    nock('https://api.blockscore.com/')
      .get('/people/' + blockscoreResponse.id)
      .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 
    
    request.get({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : true
    }, function(err,resp,body) { 
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'incomplete');
      validAttestation(body.attestation, function(err, payload) {
        assert.ifError(err); 
        assert.strictEqual(typeof payload, 'object'); 
        assert.strictEqual(payload.profile_verified, true);
        assert.strictEqual(payload.identity_verified, false);
        
        validAttestation(body.blinded, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          assert.strictEqual(payload.profile_verified, true);
          assert.strictEqual(payload.identity_verified, false);
          done();
        });
      });
    });
  });    
  
  it('should update an existing attestation (person, score < 80)', function(done) {
    var params = {
      answers : answers
    };

    nock('https://api.blockscore.com/')
      .post('/question_sets/' + questionsResponse.id + '/score')
      .reply(200, answersResponse, {'Content-Type': 'text/plain'}); 
    

    request.post({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : params
    }, function(err,resp,body) {  
      assert.ifError(err);
      assert.strictEqual(body.result, 'error');
      assert.strictEqual(body.message, 'questions not adequately answered');
      done();
    });
  });  
  
  it('should update an existing attestation (person, score > 80)', function(done) {
    var params = {
      answers : answers
    };
    
    answersResponse.score = 80;

    nock('https://api.blockscore.com/')
      .post('/question_sets/' + questionsResponse.id + '/score')
      .reply(200, answersResponse, {'Content-Type': 'text/plain'}); 

    nock('https://api.blockscore.com/')
      .get('/people/' + blockscoreResponse.id)
      .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 

    request.post({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : params
    }, function(err,resp,body) { 
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'verified');
      
      validAttestation(body.attestation, function(err, payload) {
        assert.ifError(err); 
        assert.strictEqual(typeof payload, 'object'); 
        assert.strictEqual(payload.profile_verified, true);
        assert.strictEqual(payload.identity_verified, true);
        validAttestation(body.blinded, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object');
          assert.strictEqual(payload.profile_verified, true);
          assert.strictEqual(payload.identity_verified, true);          
          done();
        });
      });
    });
  }); 
  
  it('should retrieve an existing attestation (person, verified)', function(done) {

    nock('https://api.blockscore.com/')
      .get('/people/' + blockscoreResponse.id)
      .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 
    
    request.get({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : true
    }, function(err,resp,body) {   
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'verified');
      
      validAttestation(body.attestation, function(err, payload) {
        assert.ifError(err); 
        assert.strictEqual(typeof payload, 'object'); 
        assert.strictEqual(payload.profile_verified, true);
        assert.strictEqual(payload.identity_verified, true); 
        validAttestation(body.blinded, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          assert.strictEqual(payload.profile_verified, true);
          assert.strictEqual(payload.identity_verified, true);           
          done();
        });
      });
    });
  });

  it('should initiate a new attestation (organzation)', function(done) {

    var params = {
      type    : 'organization',
      profile : organizationProfile
    };

    nock('https://api.blockscore.com/')
      .post('/companies')
      .reply(200, organizationResponse, {'Content-Type': 'text/plain'}); 
    
    nock('https://api.blockscore.com/')
      .get('/companies/' + organizationResponse.id)
      .reply(200, organizationResponse, {'Content-Type': 'text/plain'});     

    request.post({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : params
    }, function(err,resp,body) {

      assert.ifError(err);
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'verified');
      validAttestation(body.attestation, function(err, payload) {
        assert.ifError(err); 
        assert.strictEqual(typeof payload, 'object'); 
        assert.strictEqual(payload.profile_verified, true);
        
        validAttestation(body.blinded, function(err, payload) {
          assert.ifError(err); 
          assert.strictEqual(typeof payload, 'object'); 
          assert.strictEqual(payload.profile_verified, true);
          done();
        });
      });
    });
  });    

  it('should initiate a new attestation (person, non-US)', function(done) {

    var params = {
      type      : 'person',
      profile   : profile,
    };

    params.profile.address.country          = 'NZ';
    blockscoreResponse.address_country_code = 'NZ';

    nock('https://api.blockscore.com/')
      .post('/people')
      .reply(200, blockscoreResponse, {'Content-Type': 'text/plain'}); 

    request.post({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : params
    }, function(err,resp,body) {
      assert.ifError(err);
      assert.strictEqual(body.result, 'success');
      assert.strictEqual(body.status, 'incomplete');
      assert.strictEqual(typeof body.questions, 'undefined');
      assert.strictEqual(body.requirements[0], 'photo');
      assert.strictEqual(body.requirements[1], 'photo_id');
      done();
    });
  });

/*  
  it('should update an attestation with photo, and photo_id (person, non-US)', function(done) {

    var params = {
      type      : 'person',
      photo     : 'zzzzzzz',
      photo_id  : 'aaaaaa',
    };
    
    nock('https://netverify.com/api/netverify/v2/')
      .post('/peformNetverify')
      .reply(200, netverifyResponse, {'Content-Type': 'text/plain'}); 

    request.post({
      url  : 'http://localhost:5150/v1/attestation?signature_blob_id='+testutils.person.id,
      json : params
    }, function(err,resp,body) {
      console.log(err, body);
      done();
    });
  });    
*/  
});
