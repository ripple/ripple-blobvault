var RL = require('ripple-lib');
var QL = require('queuelib');
var eclib = require('./lib')

var Campaign = function(db,config) {
    // list all users joined with the memoization table campaigns
    var remote = new RL.Remote(config.ripplelib);
    var check = function() {
        console.log("\nCheck!");
        var now = new Date();
        var timetill = new Date(now.getFullYear(), now.getMonth(), now.getDate(), config.schedule.hour, config.schedule.minute, 0, 0) - now;
        if (timetill < 0) 
            timetill += 86400000; // one day
        timetill = 5500;
        console.log("Time till next email campaign service:" + ~~(timetill / (60*1000)) + " minutes");
        checktimer = setTimeout(work,timetill);
    };
    var checktimer;
    var work = function() {
        console.log("Work!");
        var q = new QL;
        q.series([
        // create table of users of unfunded or unchecked
        function(lib) {
            eclib.scan(db,function(rows) {
                lib.set({rows:rows})
                lib.done();
            });
        },
        // check those users to see if they've funded, then mark it
        function(lib) {
            var rows = lib.get('rows');
            console.log("Start of qlist",rows)
            var q = new QL;
            q
              .list(rows)
              .forEach(function(row,idx,lib2) {
                console.log("ForEach row:", row);
                eclib.checkLedger(row.address,remote,function(isFunded) {
                    if (isFunded) {
                        console.log("Is funded. inserting into campaigns")
                        db('campaigns')
                        .insert({address:row.address,campaign:'fund-name',isFunded:isFunded})
                        .then(function() {
                            console.log("forEachRow DONE!")
                            row.isFunded = isFunded
                            lib2.done()
                        })
                        .catch(function(e) {
                            console.log(e)
                        })
                    } else {
                        row.isFunded = isFunded
                        lib2.done()
                    }
                });
              })
              .end(function() {
                console.log("end of qlist")
                lib.set({rows:rows})
                lib.done()
              })
        },
        // mark the unfunded users who have gone past 30 days without funding
        function(lib) {
            console.log("mark account locked step")
            var rows = lib.get('rows')
            rows.forEach(function(row) {
                if (!row.isFunded) {
/*
                    db('campaigns')
                    .update({nded:isFunded})
                    .then(function() {
                        console.log("forEachRow DONE!")
                        row.isFunded = isFunded
                        lib2.done()
                    });
*/
                }
            })
            lib.done()
        },
        // get those requiring 30 day notices
        // get those requiring 3 day notices
        function(lib) {
            var rows = lib.get('rows');
            var set_30days = eclib.getByDuration(30,rows);
            var set_3days = eclib.getByDuration(3,rows);
            lib.done()
        },
        function(lib) {
            console.log("Email service all done.");
            check(); // setup the next time
            lib.done();
        }
        ]);
    };
    this.start = function(ready) {
        console.log("starting services.");
        remote.once('connect',function() {
            ready();
            check();
        });
        remote.connect();
    };
    this.stop = function() {
        console.log("stopping email campaign");
        remote.disconnect()
        clearTimeout(checktimer);
    };
};

module.exports = exports = Campaign;
