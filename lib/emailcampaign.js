var RL = require('ripple-lib');
var UInt160 = RL.UInt160;
var QL = require('queuelib');

var Campaign = function(db,config) {
    var remote = new RL.Remote(config.ripplelib);
    // list all users joined with the memoization table campaigns
    var scan = function(db,cb) {
        db('blob')
            .join('campaigns','blob.address','=','campaigns.address','LEFT OUTER')
            .select('blob.address','campaigns.last_emailed','campaigns.campaign','campaigns.isFunded')
            .then(function(rows) {
                cb(rows);
            })
            .catch(function(e) {
                console.log("Caught E:", e);
            });
    }
    var checkLedger = function(address,cb) {
        console.log("checkLedger:" + address);
        if (UInt160.is_valid(address) == false) {
           console.log("Not a valid ripple address!" + address);
            cb(false);
            return
        }
        remote.request_account_tx({forward:true,limit:1,ledger_index_min:-1,ledger_index_max:-1,account:address},function(err,resp){
            if ((!err) && (resp) && (resp.transactions) && (resp.transactions.length))
                cb(true) 
            else
                cb(false)
        });
    }
    var checktimer;
    var work = function() {
        console.log("Work!");
        var q = new QL;
        q.series([
        function(lib) {
            scan(db,function(rows) {
                lib.set({rows:rows})
                lib.done();
            });
        },
        function(lib) {
            var rows = lib.get('rows');
            console.log("rows:",rows);
            var ledger_queue = new QL;
            if (rows.length) 
                rows.forEach(function(row,idx) {
                    ledger_queue.pushAsync(function(lib2) {
                        // check if isFunded is falsy
                        if (!row.isFunded) {
                            if (!row.last_emailed) {
                                checkLedger(row.address,function(isFunded) {
                                    console.log(row.address + " is funded? " + isFunded);
                                    // update the memo
                                    if (isFunded) 
                                        db('campaigns')
                                            .insert({address:row.address,campaign:'fund-name',isFunded:isFunded})
                                            .then();
                                    else {
                                        // send initial email
                                        var currTime = new Date().getTime();
                                        db('campaigns')
                                            .insert({address:row.address,start_time:currTime,last_emailed:currTime,campaign:'fund-name',isFunded:isFunded})
                                            .then();
                                    }
                                    lib2.done();
                                    if (idx == (rows.length - 1))
                                        lib.done();
                                });
                            } else { 
                                var currTime = new Date().getTime();
                                var diff = currTime - row.start_time;
                                var days = diff / 86400000; // days elapsed
                                if ((days < 27 ) && (days >= 26)) {
                                    db('campaigns')
                                        .insert({address:row.address,start_time:currTime,last_emailed:currTime,campaign:'fund-name',isFunded:isFunded})
                                        .then();
                                    // send 3 day notice
                                }
                            }
                        } else {
                            // proceed if we don't have to check the ledger
                            lib2.done(); 
                            if (idx == (rows.length - 1))
                                lib.done();
                        }
                    });
                })
            else 
                lib.done();
        },
        function(lib) {
            console.log("Email service all done.");
            check(); // setup the next time
            lib.done();
        }
        ]);
    };
    var check = function() {
        var now = new Date();
        var timetill = new Date(now.getFullYear(), now.getMonth(), now.getDate(), config.schedule.hour, config.schedule.minute, 0, 0) - now;
        if (timetill < 0) 
            timetill += 86400000; // one day
        console.log("Time till next email campaign service:" + ~~(timetill / (60*1000)) + " minutes");
        timetill = 5500;
        checktimer = setTimeout(work,timetill);
    };
    this.start = function(ready) {
        console.log("starting services.");
        remote.once('connect',function() {
            ready();
        });
        remote.connect();
        check();
    };
    this.stop = function() {
        console.log("stopping email campaign");
        remote.disconnect()
        clearTimeout(checktimer);
    };
};

module.exports = exports = Campaign;
