var response = require('response')
exports.inspect = function(req,res,next) {
    console.log(req.method + " " + req.url);
    console.log(req.headers);
    next();
}

exports.limiter = {
    resend_email: function() {
        var hash = {};
        var check = function(req,res,next) {
            var datestr = new Date().toDateString();
            if (req.body.email) {
                if (hash[req.body.email] === undefined) {
                    hash[req.body.email] = {date:datestr,count:0}
                }
                if (hash[req.body.email].date != datestr) {
                    hash[req.body.email].count = 0;
                    hash[req.body.email].date = datestr;
                }
                hash[req.body.email].count++;
                if (hash[req.body.email].count > 5) {
                    response.json({result:'error', message:'resend limit reached'}).status(403).pipe(res)
                } else
                    next()
            } else {
                response.json({result:'error', message:'missing email in body'}).status(400).pipe(res)
            }
        }
        return {check : check}
    }
}
