var Hash = require('hashish');
var config = require('../config');
var RL = require('ripple-lib');
var UInt160 = RL.UInt160;

var counter = function() {
    var remote = new RL.Remote(config.ripplelib);
    console.log("Connecting to new ripple-lib");
    remote.connect();
    this.hash = {}
    this.add = function() {
        var fulldate = new Date();
        var date = fulldate.toDateString();
        var currtime = fulldate.getTime(); 
        if (this.hash[date] === undefined)
            this.hash[date] = {count: 0, users: [], rejectedusers:[]}
        this.hash[date].count++;
        if (this.hash[date].count > 1000) {
            this.hash[date].rejectedusers.push({fulldate:fulldate,currtime:currtime});
            return false
        }
        this.hash[date].users.push({fulldate:fulldate,currtime:currtime});
        return true
    }
    this.check = function() {
        var fulldate = new Date();
        var date = fulldate.toDateString();
        var currtime = fulldate.getTime(); 
        if (this.hash[date] === undefined)
            this.hash[date] = {count: 0, users: [],rejectedusers:[]}
        return (this.hash[date].count <= 1000)
    }
    this.toHTML = function() {
        var os = '<table border="1">';
        Hash(this.hash).forEach(function(val,key) {
            val.users.forEach(function(user,idx) {
                os += '<tr><td>' + key + "</td><td> " + (idx+1) + "</td><td>" + JSON.stringify(user) + '</td></tr>';
            });
        },this);
        os += '</table>';
        return os
    }
    this.db;
    
    // this is how to log funded migrated users that don't count against a cap
    this.markdb = function() {
        var fulldate = new Date();
        var date = fulldate.toDateString();
        var currtime = fulldate.getTime(); 
        this.db('log')
        .insert({date:date,fulldate:fulldate,isFunded:true,currtime:currtime})
        .then(function() {
            //console.log("inserted log");
        })
        return true
    }
    // this is how to log non-funded migrated users
    // this is symmetrical to .add 
    this.adddb = function() {
        var fulldate = new Date();
        var date = fulldate.toDateString();
        var currtime = fulldate.getTime(); 
        if (this.hash[date] === undefined)
            this.hash[date] = {count: 0, users: [], rejectedusers:[]}
        this.hash[date].count++;
        if (this.hash[date].count > 1000) {
            this.hash[date].rejectedusers.push({fulldate:fulldate,currtime:currtime});
            this.db('log')
            .insert({date:date,fulldate:fulldate,isFunded:false,number:this.hash[date].count,currtime:currtime,isAccepted:false,isRejected:true})
            .then(function() {
             //   console.log("inserted log");
            })
            return false
        }
        this.hash[date].users.push({fulldate:fulldate,currtime:currtime});
        this.db('log')
        .insert({date:date,fulldate:fulldate,isFunded:false,number:this.hash[date].count,currtime:currtime,isAccepted:true,isRejected:false})
        .then(function() {
            //console.log("inserted log");
        })
        return true
    }
    this.checkLedger = function(address,cb) {
        if (UInt160.is_valid(address) == false) {
            console.log("Not a valid ripple address!");
            cb(false);
            return
        }
        if (config.testmode) {
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
    this.toHTML_fromdb = function(cb) {
        var db = this.db;
        this.db('log')
            .where('isFunded','=','false')
            .select()
            .then(function(rows) {
                console.log(rows);
                var os = '<table border="1"><caption>NonFunded ('+rows.length+')</caption>';
                rows.forEach(function(row,idx) {
                    os += '<tr><td>'+row.date+'</td><td>'+(idx+1)+'</td><td>'+JSON.stringify(row)+'</td></tr>';
                })
                os += '</table>';
                return db('log')
                    .where('isFunded','=','true')
                    .select()
                    .then(function(rows) {
                        console.log(rows);
                        os += '<table border="1"><caption>Funded ('+rows.length+')</caption>';
                        rows.forEach(function(row,idx) {
                            os += '<tr><td>'+row.date+'</td><td>'+(idx+1)+'</td><td>'+JSON.stringify(row)+'</td></tr>';
                        })
                        os += '</table>';
                        cb(os);
                    })
            })
    }
}
module.exports = exports = counter
