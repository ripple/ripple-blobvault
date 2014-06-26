exports.store;
var log = function(params) {
    if (params.table === undefined) {
        var time = new Date;
        var list = [].concat.apply({},arguments).slice(1);
        list.unshift(time);
        console.log.apply({},list)
    } else {
        exports.store.db(params.table).insert(params.obj).then(function() {});
    }
};
exports.inspect = function(req,res,next) {
    log(req.method + " " + req.url);
    log(req.headers);
    if (req.body !== undefined)
    log(req.body)
    next();
}
exports.log = log;
