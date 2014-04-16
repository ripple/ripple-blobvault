var config = require('../config');
module.exports = exports = function(req,res,next) {
    var obj = {};
    obj.version = config.AUTHINFO_VERSION,
    obj.blobvault = config.url,
    obj.pakdf = config.defaultPakdfSetting
    res.writeHead(200, {
        'Content-Type' : 'application/json',
        'Access-Control-Allow-Origin': '*' 
    })
    res.end(JSON.stringify(obj));
};
