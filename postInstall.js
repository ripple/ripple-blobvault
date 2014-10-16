var config   = require('./config');
var Promise  = require('bluebird');
var fs       = Promise.promisifyAll(require("fs"));
var crypto   = require('crypto');
var reporter = require('./lib/reporter');
var ursa     = require('ursa');
var private  = './private.pem';
var public   = './public.pem';
var jwks     = './jwks.json';


//check that the necessary files are in place
//if any one is missing, create a new set
fileExists(private)
.then(function() {
  var key = fs.readFileSync('./private.pem');
  return saveKey(ursa.coercePrivateKey(key));
}).then(function(){
 return fileExists(public); 
})
.then(function() {
  return fileExists(jwks);
})
.catch(function(e) {
  createKeyPair();
});


/**
 * fileExists
 * fs exists curiously throws
 * an error to indicate it exists
 * so this function translates it
 */

function fileExists (path) {
  return fs.existsAsync(path)
  .then(function(e){
    reporter.log(path + ' not found');
    throw new Error (path + ' not found');
  })
  .error(function(e) {
    reporter.log(path + ' found');
    return true;
  });
};

/**
 * createKeyPair
 * generate a new RSA keypair
 */

function createKeyPair() {
  reporter.log('...Creating new Key Pair...');
  saveKey(ursa.generatePrivateKey());
}

/**
 * saveKey
 * save the key
 */

function saveKey (key) {
  var jwksData = {
    keys : [{
      kty : 'RSA',
      alg : 'RS256',
      use : 'sig',
      kid : crypto.randomBytes(4).toString('hex'),
      n   : key.getModulus('base64'),
      e   : key.getExponent('base64')
    }]
  };
  
  return Promise.all([
    fs.writeFileAsync(private, key.toPrivatePem('utf8'))
    .then(function() {
      reporter.log('...RSA private key saved');
    }).catch(function(e) {
      reporter.log('error saving private key');
    }),
    
    fs.writeFileAsync(public, key.toPublicPem('utf8'))
    .then(function() {
      reporter.log('...RSA public key saved');
    }).catch(function(e) {
      reporter.log('error saving public key');
    }),
       
    fs.writeFileAsync(jwks, JSON.stringify(jwksData, null, 2))
    .then(function() {
      reporter.log('...jwks.json saved');
    }).catch(function(e) {
      reporter.log('error saving jwks');
    }),
    
  ]).then(function(){
    reporter.log('done saving keys.');
  });
}

