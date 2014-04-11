var hyperglue = require('hyperglue');
var fs = require('fs');
var contents = fs.readFileSync(__dirname+ '/email.html');
var email     = require('emailjs');
var server     = email.server.connect({
   user:    "", 
   password:"", 
   host:    "", 
   ssl: true
});
var generateMessage = function(email,token) {
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
        href: 'http://api.ripplelabs.com/user/bob/verify/'+token,
        _html : 'http://api.ripplelabs.com/user/bob/verify/'+token
    }}).innerHTML;
    message.to = "<" + email + ">";
    message.from = "RippleTrade <rippletrade@ripple.com>";
    return message;
}
exports.send = function(params) {
    var email = params.email;
    var token = params.token;
    var message = generateMessage(email,token);
    server.send(message, function(err, message) { 
     //console.log(err || message); 
    });
}
