var reporter = require('./reporter');
var log = require('./log').winston;
var hyperglue = require('hyperglue');
var config = require('../config');
var fs = require('fs');
var contents = fs.readFileSync(__dirname+ '/email.html');
var contents_txt = fs.readFileSync(__dirname+ '/email.txt', 'utf8');
var email     = require('emailjs');
var dns = require('dns');
var server     = email.server.connect({
   user:    config.email.user,
   password:config.email.password,
   host:    config.email.host,
   ssl: true
});

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(config.email.password);

var generateMessage = function(email,token,name,hostlink) {
    var message    = {
       text:    contents_txt.replace('_VERIFY_URL_', hostlink + '/' + name + '/'+token).replace('_RIPPLE_NAME_',name),
       from_email:    "you <foo@bar.com>",
       to:        [],
       subject:    "Ripple",
       "headers": {
         'Reply-to' : 'support@ripple.com'
       }
    };
    if ((config.is_staging !== undefined) && (config.is_staging)) {
        message.subject = '[Staging] ' + message.subject;
    }

    message.to = [{
      email: email,
      type: 'to'
    }];

    var fromParts = config.email.from.match(/([^<]*)<([^>]*)/)
    message.from_name = fromParts[1];
    message.from_email = fromParts[2];

    message.html = hyperglue(contents, {
      '#email': {
          href: hostlink + '/' + name + '/'+token,
          _html:hostlink + '/' + name + '/'+token
      },
      '#ripplename': name
    }).innerHTML;

    return message;
}
exports.send = function(params) {
    log.info("Email send params", params);
    var email = params.email;
    var name = params.name;
    var token = params.token;
    var hostlink = params.hostlink

    // check MX record before sending e-mail
    var domain = email.replace(/.*@/, '');
    log.info('Checking MX record for domain [' + domain + ']');
    dns.resolve(domain, 'MX', function(err, addresses) {
      if (err) {
        log.err('Error in DNS MX record lookup for: ' + domain);
        return;
      }
      // check for empty arrary
      if (Array.isArray(addresses)) {
          log.info('MX record checked.  Send E-mail.');
          var message = generateMessage(email,token,name,hostlink);	  
          mandrill_client.messages.send({'message': message, 'async': true},
                  function(result) {
          log.info('MailDelivery sent mail to', email);
        }, function(errMail) {
          log.warn('MailException sending mail to', [email, errMail]);
        });
      }
    });
}
exports.notifypasswordchange = function(params) {
    var contents = fs.readFileSync(__dirname+ '/email-notifypasswordchange.html');
    var contents_txt = fs.readFileSync(__dirname+ '/email-notifypasswordchange.txt', 'utf8');
    var generateMessage = function(email,username) {
        var message    = {
           text:    contents_txt.replace(/_USERNAME_/g, username),
           from:    "you <foo@bar.com>",
           to:        "someone <foo@bar.com>",
           subject:    "Ripple - Password Change Notification",
           'Reply-to' : 'support@ripple.com',
           attachment:
           [
            {
                data:undefined,
                alternative:true
            }
           ]
        };
        if ((config.is_staging !== undefined) && (config.is_staging)) {
            message.subject = '[Staging] ' + message.subject;
        }
        message.attachment[0].data = contents.toString().replace(/_USERNAME_/g, username)
        message.to = "<" + email + ">";
        message.from = config.email.from;
        return message;
    }
    var email = params.email;
    var username = params.username;
    var message = generateMessage(email,username)
    server.send(message,function(err,message) {
    })
}
exports.notifynamechange = function(params) {
    var contents = fs.readFileSync(__dirname+ '/email-notifynamechange.html');
    var contents_txt = fs.readFileSync(__dirname+ '/email-notifynamechange.txt', 'utf8');
    var generateMessage = function(email,oldname,newname) {
        var message    = {
           text:    contents_txt.replace('_NEW_NAME_', newname).replace('_OLD_NAME_',oldname),
           from:    "you <foo@bar.com>",
           to:        "someone <foo@bar.com>",
           subject:    "Ripple - Name Change Notification",
           'Reply-to' : 'support@ripple.com',
           attachment:
           [
            {
                data:undefined,
                alternative:true
            }
           ]
        };
        if ((config.is_staging !== undefined) && (config.is_staging)) {
            message.subject = '[Staging] ' + message.subject;
        }
        message.attachment[0].data = contents.toString().replace('_NEW_NAME_', newname).replace('_OLD_NAME_',oldname);
        message.to = "<" + email + ">";
        message.from = config.email.from;
        return message;
    }
    var email = params.email;
    var newname = params.new_username;
    var oldname = params.old_username;
    var message = generateMessage(email,oldname,newname)
    server.send(message,function(err,message) {
    })
}
