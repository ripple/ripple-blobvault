var response = require('response');

exports.store;
exports.setStore = function(store) {
  exports.store = store;
};

exports.getID = function (req, res, next) {
  console.log("validate identity", req.query);
  exports.store.blobGet({blob_id:req.query.signature_blob_id},function(resp) {
    if (resp.error) {
      response.json({result:'error',message:'invalid blob'}).status(400).pipe(res);
    } else if (!resp.identity_id) {
      response.json({result:'error',message:'blob is missing identity_id'}).status(400).pipe(res);
    } else {
      req.params.identity_id = resp.identity_id;
      next();
    }
  });
}