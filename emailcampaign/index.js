var reporter = require('../lib/reporter');
var RL = require('ripple-lib');
var QL = require('queuelib');
var eclib = require('./lib')
var Hash = require('hashish')
var async = require('async')
var protector = require('timeout-protector')

var Campaign = function(db,config) {
    var self = this;
    // list all users joined with the memoization table campaigns
    var remote = new RL.Remote(config.ripplelib);
    var checktimer;
    var check = function() {
        var now = new Date();
        var timetill = new Date(now.getFullYear(), now.getMonth(), now.getDate(), config.schedule.hour, config.schedule.minute, 0, 0) - now;
        if (timetill < 0) 
            timetill += 86400000; // one day
        self.probe({action:'check',timetill:timetill})
        checktimer = setTimeout(work,timetill);
    };
    // additional time is only set for testing purposes
    var work = function(additional_time) {
        console.log("work")
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
            var qe = new QL;
            qe.forEach(rows,function(row,idx,lib2) {
                reporter.log("campaigns: checking ledger for funding", row)
                var mycb = function(isFunded) {
                    if (isFunded == 'timeout') {
                        rows[idx].isFunded = null;
                        reporter.log(idx + " / " + rows.length)
                        lib2.done()
                        return
                    }
                    db('campaigns')
                    .where('address','=',row.address)
                    .select()
                    .then(function(db_rows) {
                        if (db_rows.length) // then update
                            return db('campaigns')
                            .where('address','=',row.address)
                            .update({isFunded:isFunded})
                            .then(function() {
                                rows[idx].isFunded = isFunded;
                                self.probe({action:'update',row:row})
                            })
                            .catch(function(e) {
                                reporter.log("campaigns update error",e)
                            })
                        else  { // then insert
                            var curr_time = new Date().getTime()
                            var data = {start_time:curr_time,address:row.address,campaign:'fund-name',isFunded:isFunded};
                            return db('campaigns')
                            .insert(data)
                            .then(function() {
                                Hash(rows[idx]).update(data);
                                self.probe({action:'insert',row:rows[idx]})
                            })
                            .catch(function(e) {
                                reporter.log("campaigns insert error",e)
                            })
                        }
                    })
                    .then(function() {
                        reporter.log(idx + " / " + rows.length)
                        lib2.done()
                    })
                    .catch(function(e) {
                        reporter.log("campaigns select error",e)
                        lib2.done()
                    })
                }
                eclib.checkLedger(row.address,remote,protector(mycb,5000,'timeout'))
            },function() {
                reporter.log("emailcampaign: Check fund finished.")
                lib.set({rows:rows})
                lib.done() 
            },1000)
        },
        // route into either lock, initial 30 day, or 3 day notice
        function(lib) {
            reporter.log("emailcampaign: mark account locked step")
            var rows = lib.get('rows')
            var qe = new QL;
            qe.forEach(rows,function(row,idx,lib2) {
                if ((row.isFunded === false) && (row.start_time)) {
                    var curr_time = new Date().getTime()
                    if (additional_time !== undefined) {
                        reporter.log("test: adding additional time", additional_time)
                        curr_time += additional_time
                    }
                    var diff = curr_time - row.start_time;
                    var days = diff / (1000*60*60*24)

                    // set lock
                    reporter.log("emailcampaign: set lock test: days:" , days, "row:" , row)
                    // if we have already given notice (last_emailed) and 
                    // row is not yet locked, then and only then do we 
                    // move it over to locked table
                    if ((days > 30) && (row.last_emailed) && (row.locked == '')) {
                        reporter.log("emailcampaign: moving ", row, " to locked!")
                        db.transaction(function(t) {
                            db('blob')
                                .transacting(t)
                                .where('address','=',row.address)
                                .select()
                                .then(function(resp) {
                                    return db('locked_users')
                                    .insert(resp[0])
                                    .then()
                                })
                                .then(function() {
                                    return db('blob')
                                    .where('address','=',row.address)
                                    .delete()
                                    .then()
                                })
                                .then(function() {
                                    return db('campaigns')
                                    .where('address','=',row.address)
                                    .update({locked:'30+ days unfunded'})
                                    .then()
                                })
                                .then(t.commit, t.rollback);
                        }).then(function() {
                            reporter.log('emailcampaign:lockedusers:move row user saved.' + row.address);
                            self.probe({action:'locked',row:row})
                            lib2.done()
                        }, function(e) {
                            reporter.log('emailcampaign:lockedusers:error : ', e,'  on move row ' + row.address);
                            lib2.done() 
                        })
                    // or send initial notice
                    } else if (!row.last_emailed) {
                        db('campaigns')
                        .where('address','=',row.address)
                        .update({last_emailed:curr_time})
                        .then(function(resp) {
                            if (resp) {
                                self.probe({action:'initial notice',row:row})
                                eclib.send({email:row.email,name:row.username,days:'thirty'})
                            }
                            lib2.done()        
                        })
    
                    // or possibly send 7 day notice
                    } else if ((days < 24) && (days >= 23)) {
                        db('campaigns')
                        .where('address','=',row.address)
                        .update({last_emailed:curr_time})
                        .then(function(resp) {
                            if (resp) {
                                self.probe({action:'7 day notice',row:row})
                                eclib.send({email:row.email,name:row.username,days:'seven'})
                            }
                            lib2.done()        
                        })
                    // or possibly send 2 day notice
                    } else if ((days < 29) && (days >= 28)) {
                        db('campaigns')
                        .where('address','=',row.address)
                        .update({last_emailed:curr_time})
                        .then(function(resp) {
                            if (resp) {
                                self.probe({action:'2 day notice',row:row})
                                eclib.send({email:row.email,name:row.username,days:'two'})
                            }
                            lib2.done()        
                        })
                    } else {
                        reporter.log("emailcampaigns: no action taken for ", row.username)
                        lib2.done()
                    }
                } else 
                    lib2.done()
            },function() {
                reporter.log("campaigns: all done mailing step")
                lib.done()
            },2000)
        },
        function(lib) {
            self.probe({action:'done'})
            reporter.log("Email service all done.");
            check(); // setup the next time
            lib.done();
        }
        ]);
    };
    this.start = function(ready,test_override) {
        this.probe({action:'start'})
        reporter.log("starting services.");
        if (test_override === undefined) {
            remote.once('connect',function() {
                ready();
                check();
            });
        } else {
                ready();
                work();
        }
        var remote_reconnector = require('../lib/remote-reconnector')(remote);
    };
    // test related function
    this._forcework = function(add_time) {
        work(add_time);
    }
    this.stop = function() {
        reporter.log("stopping email campaign");
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
