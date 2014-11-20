var config   = require('../../config');
var reporter = require('../../lib/reporter');
var utils    = require('../../lib/utils');
var Queue    = require('queuelib');
var client   = require('blockscore')(config.blockscore.key);
var sjcl     = require('ripple-lib').sjcl;
var store    = require('./store');
var getAttestation = require('./get');

module.exports = function (options, callback) {
  
  if (!options.subject) {
    return callback({
      message : '\'subject\' identifier is required',
      code    : 400
    });
  } else if (!options.client_id) {
    return callback({
      message : '\'client_id\' is required',
      code    : 400
    });    
  } else if (!options.profile && 
             !options.answers && 
             !options.photo   &&
             !options.photo_id) {
    return callback({
      message : 'missing required parameters is required',
      code    : 400
    });   
  }
  
  //new organization attestation
  if (options.type === 'organization') {
    createOrganizationAttestation(options, callback);
    
  //submitting answers to questions
  } else if (options.answers) {
    answerQuestions(options, callback);
    
  //submitting photos for verification  
  } else if (options.photo || options.photo_id) {
    
  //initiating a new attestation  
  } else {
    createPersonAttestation(options, callback);
  }
};

/**
 * conformPersonProfile
 * conform parameters to blockscore's
 * requirements for a person
 */

function conformPersonProfile (data) {
  var profile = {
  identification : { },
  name           : { },
  address        : { },
  };
    
  profile.name_first   = data.name.given;
  profile.name_last    = data.name.family;
  profile.name_middle  = data.name.middle;
  
  profile.birth_day    = data.birth_day;
  profile.birth_month  = data.birth_month;
  profile.birth_year   = data.birth_year;

  if (data.id_document) {
    profile.document_type  = data.id_document.type;
    profile.document_value = data.id_document.value;
  }

  if (data.address) {
    profile.address_street1      = data.address.line1; 
    profile.address_street2      = data.address.line2;  
    profile.address_city         = data.address.locality; 
    profile.address_subdivision  = data.address.region; 
    profile.address_postal_code  = data.address.postal_code; 
    profile.address_country_code = data.address.country;   
  }
  
  return profile;
};

/**
 * conformOrganizationProfile
 * conform parameters to blockscore's
 * requirements for an organization
 */

function conformOrganizationProfile (data) {
  var profile = {
    address : { }
  };
  
  profile.entity_name = data.name;
  profile.dbas        = data.aliases;
  profile.tax_id      = data.tax_id;
  
  if (data.incorporated) {
    profile.incorporation_type  = data.incorporated.type;
    profile.incorporation_state = data.incorporated.region;
    profile.incorporation_country_code = data.incorporated.country;
    
    if (data.incorporated.date) {
      profile.incorporation_day   = data.incorporated.date.day;
      profile.incorporation_month = data.incorporated.date.month;
      profile.incorporation_year  = data.incorporated.date.year;
    }
  }
  
  if (data.address) {
    profile.address_street1      = data.address.line1; 
    profile.address_street2      = data.address.line2;  
    profile.address_city         = data.address.locality; 
    profile.address_subdivision  = data.address.region; 
    profile.address_postal_code  = data.address.postal_code; 
    profile.address_country_code = data.address.country;   
  }
  
  return profile;
}

/**
 * createPersonAttestation
 * create a new attestation
 * for a person
 */

function createPersonAttestation (options, callback) {
  
  var params  = conformPersonProfile(options.profile);
  var q       = new Queue;
  var country = params.address_country_code ? params.address_country_code.toUpperCase() : null;
  
  q.series([
    
    //create a new blockscore verification
    function(lib) {
      client.people.create(params, function (err, resp) {
        if (err) {     
          callback({
            message : err.toString(),
            code    : 400
          });
          lib.terminate();
          
        } else {
          lib.set({blockscore:resp});
          lib.done();
        }
      });
    },
    
    //if its US or Canada, get questions from blockscore -
    //the next step will be answering the questions
    //otherwise, the next step will be getting a photo of
    //the user and a photo id
    function(lib) {
      
      var blockscore   = lib.get('blockscore');

      //get question set for US, CA
      if ((country === 'US' || country === 'CA') && 
          blockscore.status === 'valid') {
        
        client.question_sets.create(blockscore.id, function (err, resp) { 
          
          if (err) {
            callback({
              message : err.toString(),
              code    : 400
            });
            lib.terminate();

          } else {
            lib.set({questions:resp});
            lib.set({requirements:['answers']});
            lib.done();
          }
        });
        
      //need webcam photo, and photo ID  
      } else {
        var requirements = ['photo','photo_id'];
        
        //if the profile was not valid, the person may
        //want to modify the profile and try again
        if (blockscore.status !== 'valid') {
          requirements.push('profile');
        }
        
        lib.set({requirements:requirements});
        lib.done();
      }
    },
    
    //save the pending attestation 
    function (lib) {
      var blockscore   = lib.get('blockscore');
      var questions    = lib.get('questions');
      var requirements = lib.get('requirements');
      
      var row = {
        subject           : options.subject,
        client_id         : options.client_id,
        type              : 'person',
        status            : 'incomplete',
        blockscore_id     : blockscore.id,
        blockscore_status : blockscore.status,
        questions_id      : questions ? questions.id : null,
        questions_score   : null,
        requirements      : requirements.join(','),
        country           : country
      };
      
      var result = {
        subject      : row.subject,
        status       : row.status,
        requirements : requirements,
      };
      
      if (questions) {
        result.questions = questions.questions;
      }
      
      //store it in our 'db'
      store[row.client_id + row.subject] = row;
      callback(null, result);
      lib.done();
    }
  ]);
    
}

/**
 * createOrganizationAttestation
 * create a new attestation
 * for an organization
 */

function createOrganizationAttestation (options, callback) {
  var params  = conformOrganizationProfile(options.profile);
  var country = params.address_country_code ? params.address_country_code.toUpperCase() : null;
    
  //create a new blockscore verification
  client.companies.create(params, function (err, resp) {
    if (err) {     
      callback({
        message : err.toString(),
        code    : 400
      });
      lib.terminate();

    } else {
      
      var row = {
        subject           : options.subject,
        client_id         : options.client_id,
        type              : 'organization',
        status            : resp.status === 'valid' ? 'verified' : 'unverified',
        blockscore_id     : resp.id,
        blockscore_status : resp.status,
        country           : country
      };
      
      //if valid, create attestation
      
      var result = {
        subject : row.subject,
        status  : row.status,
      };
      
      //store it in our 'db'
      store[row.client_id + row.subject] = row; 
      callback(null, result);
    }
  });
    
}

function answerQuestions (options, callback) {
  var row = store[options.client_id + options.subject];
  var q   = new Queue;

  //if not row...
  
  q.series([
    function (lib) {
      var params = {
        id      : row.questions_id,
        answers : options.answers
      };
      
      client.question_sets.score(params, function(err, resp) {
        
        //check expired
        //check time limit
        //log attempts
        
        if (err) {
          callback({
            message : err.toString(),
            code    : 400
          });
          lib.terminate();
        } else {
          lib.set({score:resp.score});
          lib.done();
        }
      });
    },
    
    function (lib) {
      var score    = lib.get('score');
      
      //if score is >= 80, save score,
      //set status to 'verified'
      if (row.blockscore_status === 'valid' && score >= 80) {
        row.score        = score;
        row.status       = 'verified';
        row.requirements = null;
        
      } else {
        row.status = 'failed';
      }
      
      //store it in our 'db'
      store[row.client_id + row.subject] = row; 
      
      //fetch the attestation if the user is verified
      if (row.status === 'verified') {
        getAttestation({
          subject   : row.subject,
          client_id : row.client_id
        }, callback);
      
      //otherwise return an error
      } else {
        callback({
          message : 'questions not adequately answered',
          code    : 400
        });     
      }
    }
  ]);
}

function PII (data) {
  var self = this;
  this._data = data;
  this.hash = function () {
    var hashed = sjcl.hash.sha256.hash(JSON.stringify(self._data));
    return sjcl.codec.hex.fromBits(hashed);
  }
  
  return this;
}
