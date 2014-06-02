exports.inspect = function(req,res,next) {
    console.log(req.method + " " + req.url);
    console.log(req.headers);
    if (req.body !== undefined)
    console.log(req.body)
    next();
}
