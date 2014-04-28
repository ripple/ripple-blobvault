var db = require('./db-mysql').connection;
var dbcommon = require('./dbcommon')(db);
module.exports = exports = function() {
    dbcommon.db = db;
    return dbcommon;
}
