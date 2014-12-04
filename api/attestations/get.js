var config     = require('../../config');
var reporter   = require('../../lib/reporter');
var blockscore = require('blockscore')(config.blockscore.key);
var signer     = require('../../lib/signer');
var store      = require('./store');

module.exports = function(options, callback) {

  var row = store[options.client_id+options.subject];
  
  if (!row) {
    return callback({
      message : 'attestation not found',
      code    : 400
    });
    
  } else if (!row.status === 'verified') {
    var message = row.type === 'organization' ? 'organization not verified' : 'identity not verified';
    return callback({
      message : message,
      code    : 400
    });    
  }
  
  if (row.type === 'organization') {
    getOrganizationAttestation (row, callback);
  } else {
    getPersonAttestation (row, callback);
  }
}

var getOrganizationAttestation = function (row, callback) {
  blockscore.companies.retrieve(row.blockscore_id, function (err, resp) {
    var payload;
    var result;
    
    if (err) {  
      reporter.log('unable to retreive organization information:', err);
      callback({
        message : 'unable to retreive organization information',
        code    : 400
      });
    } else {
      payload = createOrganizationPayload(resp);  
      payload.profile_verified  = resp.status === 'valid' ? true : false;  
      result = createAttestations(row.subject, payload);
      
      if (result) {
        callback(null, {
          subject     : row.subject,
          status      : row.status,
          attestation : result.attestation,
          blinded     : result.blinded
        });
      } else {
        callback({
          message : 'unable to create attestations',
          code    : 500
        });
      } 
    }
  });
}

var getPersonAttestation = function (row, callback) {
  blockscore.people.retrieve(row.blockscore_id, function (err, resp) {
    var payload;
    var result;
    
    if (err) {  
      reporter.log('unable to retreive identity information:', err);
      callback({
        message : 'unable to retreive identity information',
        code    : 400
      });
    } else {
      payload = createPersonPayload(resp);
      if (row.score) {
        payload.questions_score = row.score;
      }
      
      payload.profile_verified  = resp.status === 'valid' ? true : false;  
      payload.identity_verified = row.score >= 80 ? true : false;
      result = createAttestations(row.subject, payload);
      
      if (result) {
        callback(null, {
          subject     : row.subject,
          status      : row.status,
          attestation : result.attestation,
          blinded     : result.blinded
        });
      } else {
        callback({
          message : 'unable to create attestations',
          code    : 500
        });
      }    
    }
  });
};

var createOrganizationPayload = function (blockscore) {

  var payload = { };    
  
  payload.name        = blockscore.entity_name,
  payload.aliases     = blockscore.dbas; 
  payload.tax_id      = blockscore.tax_id,

  payload.incorporated = {
    country : blockscore.incorporation_country_code,
    region  : blockscore.incorporation_state,
    type    : blockscore.incorporation_type,
    date : {
      day   : blockscore.incorporation_day,
      month : blockscore.incorporation_month,
      year  : blockscore.incorporation_year
    }
  };
    
  payload.address = {
    line1       : blockscore.address_street1,
    line2       : blockscore.address_street2, 
    locality    : blockscore.address_city,
    region      : blockscore.address_subdivision,
    postal_code : blockscore.address_postal_code,
    country     : blockscore.address_country_code
  };
    
  if (!payload.address.line2) 
    delete payload.address.line2;  

  payload.ofac_match    = blockscore.details.ofac;
  payload.context_match = {
    name    : blockscore.details.entity_name, 
    tax_id  : blockscore.details.tax_id, 
    address : blockscore.details.address,
    state   : blockscore.details.state,
    country : blockscore.details.country_code,
    incorporated_date : blockscore.details.incorp_date,
  };

  return payload;
}

var createPersonPayload = function (blockscore) {

  var payload = { };
  
  payload.given_name  = blockscore.name_first,
  payload.middle_name = blockscore.name_middle; 
  payload.family_name = blockscore.name_last,
  payload.birth_day   = blockscore.birth_day,
  payload.birth_month = blockscore.birth_month,
  payload.birth_year  = blockscore.birth_year,
  payload.id_document = {
    type  : blockscore.document_type,
    value : blockscore.document_value,
  };
  payload.address = {
    line1       : blockscore.address_street1,
    line2       : blockscore.address_street2, 
    locality    : blockscore.address_city,
    region      : blockscore.address_subdivision,
    postal_code : blockscore.address_postal_code,
    country     : blockscore.address_country_code
  };

    
  if (!payload.address.line2) 
    delete payload.address.line2;  
  if (!payload.middle_name) 
    delete payload.middle_name; 
  
  if (blockscore.phone_number)
    payload.phone = blockscore.phone_number 
  if (blockscore.ip_address) 
    payload.ip_address = blockscore.ip_address

  payload.address_risk  = blockscore.details.address_risk;
  payload.ofac_match    = blockscore.details.ofac;
  payload.pep_match     = blockscore.details.pep;
  payload.context_match = {
    address        : blockscore.details.address,
    identification : blockscore.details.identification,
    birthdate      : blockscore.details.date_of_birth,
  };

  return payload;
}

var createAttestations = function (subject, payload) {
  var blindedPayload;

  payload.iss = config.issuer;
  payload.sub = subject;
  payload.exp = ~~(new Date().getTime() / 1000) + (30 * 60);
  payload.iat = ~~(new Date().getTime() / 1000 - 60);

  blindPayload = {
    iss : payload.iss,
    sub : payload.sub,
    exp : payload.exp,
    iat : payload.iat,
    address_risk  : payload.address_risk,
    ofac_match    : payload.ofac_match,
    pep_match     : payload.pep_match, 
    context_match : payload.context_match,
    profile_verified  : payload.profile_verified,
    identity_verified : payload.identity_verified
  };

  try {
    return {
      attestation : signer.signJWT(payload),
      blinded     : signer.signJWT(blindPayload),
    };

  } catch (e) {
    reporter.log("unable to sign JWT:", e);
  }
};