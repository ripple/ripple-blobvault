var reporter = require('../lib/reporter');
var request = require('request');
var response = require('response');

var requestAttestation = function(req,res,next) {
    
    response.json({result:'attestation result'}).pipe(res)
}
module.exports = exports = requestAttestation;
