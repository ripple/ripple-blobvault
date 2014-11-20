var update   = require('./update');
var request  = require('request');
var response = require('response');

//create or update an in progress attestation
exports.update = function (req, res, next) {
  var options       = req.body;
  options.subject   = req.params.identity_id;
  options.client_id = 'http://id.ripple.com'; 
  
  update(req.body, function (err, resp) {
    if (err) {
      response.json({
        result  : 'error',
        message : err.message
      }).status(err.code).pipe(res);
    
    } else {
      if (!resp) resp = {};
      resp.result = 'success';
      response.json(resp).pipe(res);
    }
  }); 
};

//get existing attestation
exports.get    = function (req, res, next) {

};
