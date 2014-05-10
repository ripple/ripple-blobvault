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
                    res.writeHead(403, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    })
                    res.end(JSON.stringify({result:'error', message:'resend limit reached'}));
                } else
                    next()
            } else {
                res.writeHead(400, {
                    'Content-Type' : 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                })
                res.end(JSON.stringify({result:'error', message:'missing email in body'}));
            }
        }
        return {check : check}
    }
}
