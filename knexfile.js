var config = require('./config')
var obj = {
    integration: {
        client: config.dbtype,
        connection: config.database[config.dbtype]
    },
    staging: {
        client: config.dbtype,
        connection: config.database[config.dbtype]
    },
    production: {
        client: config.dbtype,
        connection: config.database[config.dbtype]
    }
};
// some call it integration
obj.development = obj.integration;
module.exports = exports = obj;
