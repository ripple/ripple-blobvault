var domain = require('domain');
var d = domain.create();
var bindObject = function(obj1,binder) {
    Object.keys(obj1).forEach(function(key) {
        if (obj1.hasOwnProperty(key)) {
            obj1[key] = d.bind(obj1[key]);
        }
    });
}
d.on('error',function (obj) {
    if ((obj.res) && (obj.error !== undefined))
        response.json({result:'error',message:obj.error.message}).status(obj.statusCode || 400).pipe(obj.res)
});
exports.setDomain = function(obj) {
    bindObject(obj);
}
