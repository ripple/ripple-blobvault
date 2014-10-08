var fs = require('fs');
var response = require('response');
var Keys = { };

/**
 * JSON web key set endpoint
 */

Keys.jwks = function (req, res) {
  var stream = fs.createReadStream('./jwks.json');
  
  stream.on('open', function() {
    stream.pipe(res);
  });
  
  stream.on('error', function(err) {
    res.end(err);
  });  
};

/**
 * public key certificate endpoint
 */

Keys.public = function (req, res) {
  var stream = fs.createReadStream('./public.pem');
  
  stream.on('open', function() {
    stream.pipe(res);
  });
  
  stream.on('error', function(err) {
    res.end(err);
  }); 
};

module.exports = exports = Keys;