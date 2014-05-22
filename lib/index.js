exports.inspect = function(req,res,next) {
    console.log(req.method + " " + req.url);
    console.log(req.headers);
    next();
}
