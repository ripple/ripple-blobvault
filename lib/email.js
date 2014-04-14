var hyperglue = require('hyperglue');
var config = require('../config');
var fs = require('fs');
var contents = fs.readFileSync(__dirname+ '/email.html');
var email     = require('emailjs');
var server     = email.server.connect({
   user:    config.email.user, 
   password:config.email.password, 
   host:    config.email.host, 
   ssl: true
});
var generateMessage = function(email,token,name,hostlink) {
    var message    = {
       text:    "Welcome to RippleTrade! Verify your email", 
       from:    "you <foo@bar.com>", 
       to:        "someone <foo@bar.com>",
       subject:    "Welcome to RippleTrade! Verify your email",
       attachment: 
       [
        {
            data:undefined,
            alternative:true
        }
       ]
    };
    message.attachment[0].data = hyperglue(contents, {
    '#email': {
        href: hostlink + '?name=' + name + '&token='+token,
        _html:config.url+'/v1/user/'+name+'/verify/'+token 
    }}).innerHTML;
    message.to = "<" + email + ">";
    message.from = config.email.from;
    return message;
}
exports.send = function(params) {
    var email = params.email;
    var name = params.name;
    var token = params.token;
    var hostlink = params.hostlink
    var message = generateMessage(email,token,name,hostlink);
    server.send(message, function(err, message) { 
     //console.log(err || message); 
    });
}
