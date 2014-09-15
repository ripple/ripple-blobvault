var response = require('response');

exports.store;
exports.setStore = function(store) {
  exports.store = store;
};

exports.getID = function (req, res, next) {
  exports.store.read_where({key:'id', value:req.query.signature_blob_id},function(resp) {
    if (resp.error) {
      response.json({result:'error',message:'invalid blob'}).status(400).pipe(res);
    } else if (!resp[0].identity_id) {
      response.json({result:'error',message:'blob is missing identity_id'}).status(400).pipe(res);
    } else {
      req.params.identity_id    = resp[0].identity_id;
      req.params.ripple_name    = resp[0].username;
      req.params.ripple_address = resp[0].address; 
      next();
    }
  });
}