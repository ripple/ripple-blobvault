var config  = require('../config');
var request = require('request');
var Client  = { };

Client.performNetverify = function (options, callback) {
  post('performNetverify', {
    customerId : options.subject,
    merchantIdScanReference : options.subject,
    frontsideImage : options.photo_id,
    faceImage : options.photo
  },
  function (err, resp) {
    console.log(err, resp);
  });
}

function post (route, params, callback) {
  var url = 'https://netverify.com/api/netverify/v2/' + route;
  var options = {
    url : url,
    headers : {
      'Content-Type' : 'application/json',
      'Accept' : 'application/json',
      'User-Agent' : config.jumio.companyName + ' ' + config.jumio.applicationName + '/' + config.jumio.version,
    },
    auth : {
    'user': config.jumio.user,
    'pass': config.jumio.pass,
    },
    json : params
  };
  
  request.post(options, callback);
/*  
  request.post('https://netverify.com/api/netverify/v2/' + route)
  .set('Content-Type', 'application/json')
  .set('Accept', 'application/json')
  .set('User-Agent', config.jumio.companyName + ' ' + config.jumio.applicationName + '/' + config.jumio.version)
  .auth(config.jumio.user, config.jumio.password)
  .send({ name: 'tj', pet: 'tobi' })
  .end(callback)
  */
}

module.exports = Client;