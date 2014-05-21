var RL = require('ripple-lib');
var QL = require('queuelib');
var eclib = require('./lib')
var Hash = require('hashish')
var async = require('async')

var Campaign = function(db,config) {
    var self = this;
    // list all users joined with the memoization table campaigns
    var remote = new RL.Remote(config.ripplelib);
    var check = function() {
        var now = new Date();
        var timetill = new Date(now.getFullYear(), now.getMonth(), now.getDate(), config.schedule.hour, config.schedule.minute, 0, 0) - now;
        if (timetill < 0) 
            timetill += 86400000; // one day
        self.probe({action:'check',timetill:timetill})
        checktimer = setTimeout(work,timetill);
    };
    var checktimer;
    var work = function() {
        self.probe({action:'work'})
        var q = new QL;
        q.series([
        // create table of users of unfunded or unchecked
        function(lib) {
            eclib.scan(db,function(rows) {
                lib.set({rows:rows})
                self.probe({action:'scan',rows:rows})
                lib.done();
            });
        },
        // check those users to see if they've funded, then mark it
        function(lib) {
            var rows = lib.get('rows');
            var idx = 0;
            async.each(rows,function(row,done) {
                eclib.checkLedger(row.address,remote,function(isFunded) {
                    db('campaigns')
                    .where('address','=',row.address)
                    .select()
                    .then(function(db_rows) {
                        if (db_rows.length) // then update
                            return db('campaigns')
                            .where('address','=',row.address)
                            .update({isFunded:isFunded})
                            .then(function() {
                                self.probe({action:'update',row:row})
                                rows[idx].isFunded = isFunded;
                            })
                            .catch(function(e) {
                                console.log("campaigns update error",e)
                            })
                        else  { // then insert
                            var curr_time = new Date().getTime()
                            var data = {start_time:curr_time,address:row.address,campaign:'fund-name',isFunded:isFunded};
                            return db('campaigns')
                            .insert(data)
                            .then(function() {
                                self.probe({action:'insert',row:row})
                                Hash(rows[idx]).update(data);
                            })
                            .catch(function(e) {
                                console.log("campaigns insert error",e)
                            })
                        }
                    })
                    .then(function() {
                        idx++
                        console.log(idx + " / " + rows.length)
                        done()
                    })
                    .catch(function(e) {
                        console.log("campaigns select error",e)
                    })
                });
            },function() {
                console.log("emailcampaign: Check fund finished.")
                lib.set({rows:rows})
                lib.done()
            })
        },
        // route into either lock, initial 30 day, or 3 day notice
        function(lib) {
            console.log("mark account locked step")
            var rows = lib.get('rows')
            async.each(rows,function(row,done) {
                if ((!row.isFunded) && (row.start_time)) {
                    var curr_time = new Date().getTime()
// test 7 day notice
//                    curr_time += (23.2*(1000*60*60*24))
// test 2 day notice
//                    curr_time += (28.2*(1000*60*60*24))
// test locked
//                    curr_time += (30.2*(1000*60*60*24)) 
                    var diff = curr_time - row.start_time;
                    var days = diff / (1000*60*60*24)

                    // set lock
                    if ((days > 30) && (row.last_emailed))
                        db('campaigns')
                        .where('address','=',row.address)
                        .update({locked:'30+ days unfunded'})
                        .then(function() {
                            self.probe({action:'lock',row:row})
                            done()        
                        })

                    // or send initial notice
                    else if (!row.last_emailed) {
                        db('campaigns')
                        .where('address','=',row.address)
                        .update({last_emailed:curr_time})
                        .then(function() {
                            self.probe({action:'initial notice',row:row})
                            eclib.send({email:row.email,name:row.username,days:'thirty'})
                            done()        
                        })
    
                    // or possibly send 7 day notice
                    } else if ((days < 24) && (days >= 23)) {
                        db('campaigns')
                        .where('address','=',row.address)
                        .update({last_emailed:curr_time})
                        .then(function() {
                            self.probe({action:'7 day notice',row:row})
                            eclib.send({email:row.email,name:row.username,days:'seven'})
                            done()        
                        })
                    // or possibly send 2 day notice
                    } else if ((days < 29) && (days >= 28)) {
                        db('campaigns')
                        .where('address','=',row.address)
                        .update({last_emailed:curr_time})
                        .then(function() {
                            self.probe({action:'2 day notice',row:row})
                            eclib.send({email:row.email,name:row.username,days:'two'})
                            done()        
                        })
                    } else
                        done()
                } else 
                    done()
            },function() {
                lib.done()
            })
        },
        function(lib) {
            self.probe({action:'done'})
            console.log("Email service all done.");
            check(); // setup the next time
            lib.done();
        }
        ]);
    };
    this.start = function(ready) {
        this.probe({action:'start'})
        console.log("starting services.");
        remote.once('connect',function() {
            ready();
            check();
        });
        var remote_reconnector = require('../lib/remote-reconnector')(remote);
    };
    this.stop = function() {
        console.log("stopping email campaign");
        this.probe({action:'stop'})
        remote.disconnect()
        clearTimeout(checktimer);
    };

    // the following are testing instrumentation
    var _probecb
    this.probe_subscribe = function(cb) {
        _probecb = cb
    }
    this.probe = function(data) {
        var now = new Date();
        data.time = now.getTime()
        data.readabletime = now
        if (_probecb !== undefined)
            _probecb(data)
    }
};

module.exports = exports = Campaign;
