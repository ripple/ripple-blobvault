var fs        = require('fs');
var crypto    = require('crypto');
var jwks      = require('../jwks.json');
var base64Url = require('base64-url');

var jwt = { };

/*
 * jwt-sign
 *
 * JSON Web Token RSA with SHA256 sign for Google APIs
 *
 * Copyright(c) 2012 Gustavo Machado
 * MIT Licensed
 */

/**
 * version
 */

jwt.version = '0.1.0';

/**
 * Sign the Google API jwt token.
 *
 * @param {Object} the payload part of the token.
 * @return {string} the signed and base64 encoded jwt token.
 * @api public
 */

jwt.sign = function jwt_sign(payload, key, kid) {
  // Check key
  if (!key) {
    throw new Error('key is required');
  }

  if (payload === undefined || payload === null) {
    throw new Error('palyload is required');
  }

  // header, typ is fixed value, alg supported by google is RSA with SHA256
  var header = { typ: 'JWT', alg: 'RS256' };
  
  //include kid if present
  if (kid) {
    header.kid = kid;
  }

  // create segments, all segment should be base64 string
  var segments = [];
  segments.push(base64Url.encode(JSON.stringify(header)));
  segments.push(base64Url.encode(JSON.stringify(payload)));

  var signature = sign(segments.join('.'), key);
  if (!signature) {
    throw new Error('error generating signature');
  }
  
  segments.push(signature);
  return segments.join('.');
};


/**
 * private util functions
 */

function sign (data, key) {
  var signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  return base64Url.escape(signer.sign(key, 'base64'));
}

function base64urlEncode(str) {
  return new Buffer(str).toString('base64');
}

/**
 * Exposed signer object
 */

var Signer = { };

/**
 * signJWT
 * create a signed JWT
 */

Signer.signJWT = function (payload) {
  var key  = fs.readFileSync('./private.pem');
  
  //using the kid allows us to support additional
  //private keys in the future
  return jwt.sign(payload, key, jwks.keys[0].kid);
};

module.exports = exports = Signer;