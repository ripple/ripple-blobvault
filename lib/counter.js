var counter = function() {
    this.hash = {}
    this.add = function() {
        var date = new Date().toDateString();
        if (this.hash[date] === undefined)
            this.hash[date] = {count: 0}
        this.hash[date].count++;
        if (this.hash[date].count > 1000) 
            return false
        return true
    }
    this.check = function() {
        var date = new Date().toDateString();
        if (this.hash[date] === undefined)
            this.hash[date] = {count: 0}
        return (this.hash[date].count <= 1000)
    }
}
module.exports = exports = counter
