var config = require('../config');

var mysql = require('mysql');

config.mysql.multipleStatements = true;

var c = mysql.createConnection(config.mysql);
c.connect();

exports.connection = c;
