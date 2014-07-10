var QL = require('queuelib')
var health = function(db, remote) {
    var q = new QL;
    var is_ok = undefined;
    var _timer;
    var check = function() {
        q.series([
        function(lib) {
            db('blob')
                .select()
                .limit(1)
                .then(function(resp) {
                    console.log("health: ok")
                    is_ok = true;
                    lib.done()
                })
                .catch(function(e) {
                    console.log("health: error")
                    is_ok = false
                    lib.terminate()
                })
                .finally(function(obj) {
                    console.log("FINALLY ", obj)
                })
        },
        function(lib) {
            console.log("part 2") 
            throw new Error("DKFJdFKJ")
            lib.done()
        }
        ])
         
    }
    return {
        start : function() {
            setInterval(check, 2500)
        },
        stop : function() {
            if (_timer !== undefined) 
                clearInterval(_timer)
        },
        check : function() {
            return is_ok
        },
    }
}

module.exports = exports = health
