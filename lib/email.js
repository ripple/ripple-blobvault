var reporter = require('./reporter');
var hyperglue = require('hyperglue');
var config = require('../config');
var fs = require('fs');
var contents = fs.readFileSync(__dirname+ '/email.html');
var contents_txt = fs.readFileSync(__dirname+ '/email.txt', 'utf8');
var email     = require('emailjs');
var server     = email.server.connect({
   user:    config.email.user,
   password:config.email.password,
   host:    config.email.host,
   ssl: true
});
var generateMessage = function(email,token,name,hostlink) {
    var message    = {
       text:    contents_txt.replace('_VERIFY_URL_', hostlink + '/' + name + '/'+token),
       from:    "you <foo@bar.com>",
       to:        "someone <foo@bar.com>",
       subject:    "Ripple Trade",
       'Reply-to' : 'support@ripple.com',
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
        href: hostlink + '/' + name + '/'+token,
        _html:hostlink + '/' + name + '/'+token
    }}).innerHTML;
    message.to = "<" + email + ">";
    message.from = config.email.from;
    return message;
}
exports.send = function(params) {
    reporter.log("Email send params", params);
    var email = params.email;
    var name = params.name;
    var token = params.token;
    var hostlink = params.hostlink
    var message = generateMessage(email,token,name,hostlink);
    server.send(message, function(err, message) {
     //reporter.log(err || message);
    });
}
