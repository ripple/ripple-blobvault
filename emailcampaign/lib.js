var reporter = require('../lib/reporter');
var RL = require('ripple-lib');
var hyperglue = require('hyperglue');
var config = require('../config');
var fs = require('fs');
var contents = fs.readFileSync(__dirname+ '/email.html');
var contents_txt = fs.readFileSync(__dirname+ '/email.txt', 'utf8');

var UInt160 = RL.UInt160;
var scan = function(db,cb) {
    db('blob')
        .join('campaigns','blob.address','=','campaigns.address','LEFT OUTER')
        .where('campaigns.isFunded','=',null)
        .orWhere('campaigns.isFunded','=',false)
        .andWhere('campaigns.locked','=','') // we ignore already locked users
        .select('blob.address','campaigns.locked','blob.email','blob.username','campaigns.start_time','campaigns.last_emailed','campaigns.campaign','campaigns.isFunded')
        .then(function(rows) {
            cb(rows);
        })
        .catch(function(e) {
            reporter.log("Caught E:", e);
        });
}
exports.scan = scan
var checkLedger = function(address,remote,cb) {
    //reporter.log("checkLedger:" + address);
    if (UInt160.is_valid(address) == false) {
       reporter.log("Not a valid ripple address!" + address);
        cb(false);
        return
    }
    remote.request_account_tx({forward:true,limit:1,ledger_index_min:-1,ledger_index_max:-1,account:address},function(err,resp){
        //reporter.log(arguments)
        if ((!err) && (resp) && (resp.transactions) && (resp.transactions.length))
            cb(true) 
        else
            cb(false)
    });
}
exports.checkLedger = checkLedger

var email     = require('emailjs');
var server     = email.server.connect({
   user:    config.email.user,
   password:config.email.password,
   host:    config.email.host,
   ssl: true
});
var generateMessage = function(email,days,name) {
    var text = contents_txt.replace('%USERNAME%', name).replace('%DAYS%',days);
    var message    = {
       text:    text,
       from:    "you <foo@bar.com>",
       to:        "someone <foo@bar.com>",
       subject:    "Your Ripple name "+name+" is expiring in "+days+" days",
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
    'span.username': name,
    'span.days' : days
    }).innerHTML;
    message.to = "<" + email + ">";
    message.from = config.email.from;
    return message;
}
exports.send = function(params) {
    //reporter.log("Email send params", params);
    var email = params.email;
    var name = params.name;
    var days = params.days;
    var message = generateMessage(email,days,name);
    server.send(message, function(err, message) {
        reporter.log(err || message);
    });
}
