var log = function() {
    var time = new Date;
    var list = [].concat.apply({},arguments).slice(1);
    list.unshift(time);
    console.log.apply({},list)
};
exports.inspect = function(req,res,next) {
    log(req.method + " " + req.url);
    log(req.headers);
    if (req.body !== undefined)
    log(req.body)
    next();
}
exports.log = log;
