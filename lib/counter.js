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
        var os = '<table>';
        Hash(this.hash).forEach(function(val,key) {
            val.users.forEach(function(user,idx) {
                os += '<tr><td>' + key + "</td><td> " + (idx+1) + "</td>" + JSON.stringify(user) + '</td></tr>';
            });
        },this);
        os += '</table>';
        return os
    }
}
module.exports = exports = counter
