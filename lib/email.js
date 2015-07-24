var log = require('./log').winston;
var hyperglue = require('hyperglue');
var config = require('../config');
var fs = require('fs');
var email     = require('emailjs');
var emails = require('./emails');
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
       text: emails["signup.txt"]
          .replace('_VERIFY_URL_', hostlink + '/' + name + '/'+token)
          .replace('_RIPPLE_NAME_',name),
       from_email:    "you <foo@bar.com>",
       to:        [],
       subject:    "Welcome to Ripple Trade. Please verify your email address.",
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

    message.html = emails["signup.html"]
      .replace('_VERIFY_URL_', hostlink + '/' + name + '/'+token)
      .replace('_RIPPLE_NAME_',name);

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

function makeNotify(file, subject) {
    return function(params, country) {
        var fileC         = file + "-" + country,
            contents_html = emails[fileC + ".html"] || emails[file + ".html"],
            contents_text = emails[fileC + ".txt"]  || emails[file + ".txt"];
        var tmpl = {
            USERNAME: params.username,
            TIME:     timeToString(Date.now()),
            NEW_NAME: params.new_username, // name change
            OLD_NAME: params.old_username, // name change
        };
        var message    = {
            text:       template(contents_text, tmpl),
            from:       config.email.from,
            to:         "<" + params.email + ">",
            subject:    subject,
            "Reply-to": "support@ripple.com",
            attachment: [
                {
                    data:        template(contents_html, tmpl),
                    alternative: true,
                },
            ],
        };
        if (config.is_staging) {
            message.subject = "[Staging] " + message.subject;
        }
        server.send(message, function(err, message) { })
    };
}

exports.notifypasswordchange   = makeNotify("password-change",    "Ripple Trade password change");
exports.notify2FAChange        = makeNotify("phone-change",       "Ripple Trade 2FA change");
exports.notifynamechange       = makeNotify("name-change",        "Ripple Trade - Ripple name change");
exports.notifyVerifyOk         = makeNotify("verify-ok",          "Ripple Trade has verified your account");
exports.notifyVerifyFail       = makeNotify("verify-fail",        "Ripple Trade account not verified");
exports.notifyVerifyPending    = makeNotify("verify-pending",     "Ripple Trade needs more time to review your account");
exports.notifyStepNull         = makeNotify("step-null",          "Ripple Trade request for information");
exports.notifyStepJumioID      = makeNotify("step-jumio-id",      "Ripple Trade requires additional information");
exports.notifyStepJumioDoc     = makeNotify("step-jumio-doc",     "Ripple Trade requires additional information");
exports.notifyStepJumioCompany = makeNotify("step-jumio-company", "Ripple Trade requires additional information");

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
