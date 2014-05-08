var RL = require('ripple-lib');
var UInt160 = RL.UInt160;

var Campaign = function(db,schedule,rl_address, testmode) {
    var remote = new RL.Remote(rl_address);
    var scan = function(db,done) {
        db('blob')
            .join('campaigns','blob.address','=','campaigns.address','LEFT OUTER')
            .select('blob.address','campaigns.last_emailed','campaigns.campaign','campaigns.isFunded')
            .then(function(rows) {
                console.log(rows);
                rows.forEach(function(row) {
                    if (!row.campaign) {
                        console.log("GOing to check Ledger");
                        checkLedger(row.address,function(isFunded) {
                            console.log(row.address + " is funded? " + isFunded);
                        });
                    }
                })
                // for each user, check memo table
                // if memo result is empty
                //    do lookup for tx on ripplelib -> record result in memo table
                //    mark as funded or unfunded, plus date of check
                // else get funded or unfunded result and date of check
                // if unfunded, send email
                console.log("ISussig done");
                done();
            })
            .catch(function(e) {
                console.log("Caught E:", e);
            });
    }
    var checkLedger = function(address,cb) {
        if (UInt160.is_valid(address) == false) {
           console.log("Not a valid ripple address!" + address);
            cb(false);
            return
        }
        if (testmode) {
            cb(true);
            return
        }
        remote.request_account_tx({forward:true,limit:1,ledger_index_min:-1,ledger_index_max:-1,account:address},function(err,resp){
            if ((!err) && (resp) && (resp.transactions) && (resp.transactions.length)) {
                var firsttx = resp.transactions.pop();
                var time = RL.utils.time.fromRipple(firsttx.tx.date);
                console.log("TIME TX DAY :" + new Date(time).toDateString());
                var cutofftime = new Date(config.nolimit_date).getTime();
                console.log("Cutoff Time:" + new Date(cutofftime).toDateString());
                var proceed = (time <= cutofftime);
                console.log("Time first Tx:" + time + " vs cutofftime:" + cutofftime + " proceed? " + proceed);
                cb(time <= cutofftime) 
            } else
                cb(false)
        });
    }
    this.checktimer;
    this.working = false;
    this.work = function() {
        this.working = true;
        // do some work... evetually call working = false
        console.log("Doing work.");
        var cb = function() {
            console.log("All done.");
            this.working = false;
            this.check();
        }
        scan(db,cb.bind(this));
    };
    this.check = function() {
        var now = new Date();
        var timetill = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.hour, schedule.minute, 0, 0) - now;
        if (timetill < 0) 
            timetill += 86400000; // one day
        console.log("Time till next email campaign service:" + ~~(timetill / (60*1000)) + " minutes");
        timetill = 500;
        this.checktimer = setTimeout(this.work.bind(this),timetill);
    };
    this.start = function(ready) {
        console.log("starting services.");
        remote.once('connect',function() {
            ready();
        });
        remote.connect();
        this.check();
    };
    this.stop = function() {
        console.log("stopping email campaign");
        remote.disconnect()
        clearTimeout(this.checktimer);
    };
};

module.exports = exports = Campaign;
