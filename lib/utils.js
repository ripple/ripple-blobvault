var uuid = require('node-uuid');
var generateEmailToken = function() {

    return uuid.v4()
/*
    var a = (Math.random()+1).toString(36).substr(2);
    var b = (Math.random()+1).toString(36).substr(2);
    return a.concat(b)
*/
}
exports.generateToken = generateEmailToken
