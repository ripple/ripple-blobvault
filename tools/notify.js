'use strict';

var config = require('../config');
var fs = require('fs');
var emailjs = require('emailjs');
var server = emailjs.server.connect({
  user: config.email.user,
  password: config.email.password,
  host: config.email.host,
  ssl: true
});
var store = require('../lib/store')(config.dbtype);
var Queue = require('queuelib');
var q = new Queue();
var contents = fs.readFileSync(__dirname + '/2faready.html');
var contents_txt = fs.readFileSync(__dirname + '/2faready.txt', 'utf8');
function generateMessage(email, username) {
  var message = {
    text: contents_txt.replace(/_USERNAME_/gi, username),
    from: 'you <foo@bar.com>',
    to: 'someone <foo@bar.com>',
    subject: 'Ripple Trade: now offering two-factor authentication',
    'Reply-to': 'support@ripple.com',
    attachment: [{
      data: undefined,
      alternative: true
    }]
  };
  if (config.is_staging !== undefined && config.is_staging) {
    message.subject = '[Staging] ' + message.subject;
  }
  message.attachment[0].data =
    contents.toString().replace(/_USERNAME_/gi, username);
  message.to = username + ' <' + email + '>';
  message.from = config.email.from;
  return message;
}
var success = [];
var failure = [];
q.series([
  function (lib) {
    store.db('blob').select('email', 'username').then(function (resp) {
      lib.set({list: resp});
      lib.done();
    });
  },
  function (lib) {
    var mailqueue = new Queue();
    var list = lib.get('list');
    mailqueue.forEach(list, function (item, idx, lib2) {
      var message = generateMessage(item.email, item.username);
      server.send(message, function (err, returnedMessage) {
        console.log(err, returnedMessage);
        if (!err) {
          success.push(item);
        } else {
          failure.push(item);
        }
        lib2.done();
      });
    }, function () {
      console.log('All done sending out 2fa ready emails');
      console.log('failures:', failure);
      console.log('Success:', success);
      lib.done();
    }, 1000);
  }
]);
