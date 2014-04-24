var Hash = require('hashish');
var counter = function() {
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
    // this is called symmetrical
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
            .insert({date:date,fulldate:fulldate,number:this.hash[date].count,currtime:currtime,isAccepted:false,isRejected:true})
            .then(function() {
             //   console.log("inserted log");
            })
            return false
        }
        this.hash[date].users.push({fulldate:fulldate,currtime:currtime});
        this.db('log')
        .insert({date:date,fulldate:fulldate,number:this.hash[date].count,currtime:currtime,isAccepted:true,isRejected:false})
        .then(function() {
            //console.log("inserted log");
        })
        return true
    }
    this.toHTML_fromdb = function(cb) {
        this.db('log')
            .select()
            .then(function(rows) {
                console.log(rows);
                var os = '<table border="1">';
                rows.forEach(function(row,idx) {
                    os += '<tr><td>'+row.date+'</td><td>'+(idx+1)+'</td><td>'+JSON.stringify(row)+'</td></tr>';
                })
                os += '</table>';
                cb(os);
            })
    }
}
module.exports = exports = counter
