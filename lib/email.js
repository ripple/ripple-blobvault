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

    var fromParts = config.email.from.match(/([^<]*)<([^>]*)/);
    if (fromParts.length > 2) {
      message.from_name = fromParts[1];
      message.from_email = fromParts[2];
    }

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
        log.warn('Error in DNS MX record lookup for: ' + domain);
        return;
      }
      // check for empty arrary
      if (Array.isArray(addresses)) {
        log.info('MX record checked.  Send E-mail.');
        var message = generateMessage(email,token,name,hostlink);
	    
        mandrill_client.messages.send({"message": message, "async": false}, function(result) {
          log.info("MailDelivery sent mail to",  email);
        }, function(err) {
          log.warn("MailException sending mail to", [email, err]);
        });
      }
    });
}

exports.notifypasswordchange = function(params) {
    var contents = fs.readFileSync(__dirname+ '/email-notifypasswordchange.html');
    var contents_txt = fs.readFileSync(__dirname+ '/email-notifypasswordchange.txt', 'utf8');
    var generateMessage = function(email,username) {
        var tmpl = {
            USERNAME: username,
            TIME:     timeToString(Date.now()),
        };
        var message    = {
           text:    template(contents_txt, tmpl),
           from:    "you <foo@bar.com>",
           to:        "someone <foo@bar.com>",
           subject:    "RippleID password change",
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
        message.attachment[0].data = template(contents.toString(), tmpl);
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

exports.notify2FAChange = function(params) {
    var contents     = fs.readFileSync(__dirname+ '/email-notify-2fa-change.html');
    var contents_txt = fs.readFileSync(__dirname+ '/email-notify-2fa-change.txt', 'utf8');
    var generateMessage = function(email,username) {
        var tmpl = { USERNAME: username, };
        var message    = {
           text:    template(contents_txt, tmpl),
           from:    "you <foo@bar.com>",
           to:        "someone <foo@bar.com>",
           subject:    "RippleID 2FA change",
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
        message.attachment[0].data = template(contents.toString(), tmpl);
        message.to = "<" + email + ">";
        message.from = config.email.from;
        return message;
    }
    var email = params.email;
    var username = params.username;
    var message = generateMessage(email,username)
    server.send(message,function(err,message) { })
}

exports.notifynamechange = function(params) {
    var contents = fs.readFileSync(__dirname+ '/email-notifynamechange.html');
    var contents_txt = fs.readFileSync(__dirname+ '/email-notifynamechange.txt', 'utf8');
    var generateMessage = function(email,oldname,newname) {
        var tmpl = {
            NEW_NAME: newname,
            OLD_NAME: oldname,
        };
        var message    = {
           text:    template(contents_txt, tmpl),
           from:    "you <foo@bar.com>",
           to:        "someone <foo@bar.com>",
           subject:    "RippleID - Ripple name change",
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
        message.attachment[0].data = template(contents.toString(), tmpl);
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

var DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MONTHS = [
    'January',   'February', 'March',    'April',
    'May',       'June',     'July',     'August',
    'September', 'October',  'November', 'December',
];

function timeToString(ts) {
    var d = new Date(ts);
    return DAYS[d.getDay()]
         + ", " + MONTHS[d.getMonth()]
         + " "  + d.getDate()
         + ", " + d.getFullYear();
}

function template(str, map) {
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        str = str.replace(new RegExp("_" + key + "_", "g"), map[key]);
    }
    return str;
}
