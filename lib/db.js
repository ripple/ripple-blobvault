var config = require('../config');

var Sequelize = require('sequelize'),
    sequelize = new Sequelize(config.databaseUrl, {
      dialectOptions: {
        multipleStatements: true
      }
    });

exports.connection = sequelize;
