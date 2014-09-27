var config = require('../config');
var response = require('response');
var libutils = require('../lib/utils');

exports.store;
var federation = function (req, res) {
    if (!req.query.domain || req.query.domain !== config.federation.domain) {
        response.json({"error":"invalidParams","result":"error","error_message":"Invalid domain"}).status(400).pipe(res);
        return;
    }

    if (!req.query.destination) {
      if (req.query.user) { // Compatability
          req.query.destination = req.query.user;
      } else {
        response.json({"error":"invalidParams","result":"error","error_message":"No destination provided"}).status(400).pipe(res);
        return;
      }
    }

    var normalized_username = libutils.normalizeUsername(req.query.destination);

    exports.store.read({username:normalized_username,res:res},function(resp) {
        if (resp.exists) {
            // this is a 200
            response.json({ federation_json: {
                type: "federation_record",
                destination: req.query.destination,
                domain: config.federation.domain,
                destination_address: resp.address
            }}).pipe(res);
        } else {
            response.json({"error":"noSuchUser","result":"error","error_message":"No such alias on that domain"}).status(404).pipe(res);
        }
    });
};

exports.federation = federation;
