var config = require('./config');
var store = require('./lib/store')(config.dbtype);
var health = require('./health')(store.db)

health.start()

setInterval(function() {
    console.log(health.check())
}, 500)
