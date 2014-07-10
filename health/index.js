var async = require('async')
var response = require('response')
var health = function(db, remote) {
    var is_ok = undefined;
    var _timer;
    var check = function() {
        async.waterfall([
        function(cb) {
            db('blob')
                .select()
                .limit(1)
                .then(function(resp) {
                    cb(null)
                })
                .catch(function(e) {
                    cb(new Error("db error"))
                })
        }
        ],function(err, result) {
            is_ok = !err
        })
    }
    return {
        start : function() {
            setInterval(check, 15000)
        },
        stop : function() {
            if (_timer !== undefined) 
                clearInterval(_timer)
        },
        check : function() {
            return is_ok
        },
        status : function(req,res) {
            var out = (is_ok) ? 'ok' : 'not ok'
            var st = (is_ok) ? 200 : 500
            response.json({status:out}).status(st).pipe(res)
        }
    }
}

module.exports = exports = health
