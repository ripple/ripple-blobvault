var config = require('../config')
var reporter = require('./reporter')
var libutils = require('./utils');
var Hash = require('hashish')
var DB = function() {
    this.hash = {};
    this._activetable;
    this.then = function(success, fail) {
        if (success !== undefined) 
            success()
        if (fail !== undefined) 
            fail()
        return this
    }
    this.catch = function() {
        return this
    };
    this.insert = function(obj) {
        if (this._activetable !== undefined) 
            this.hash[table].push(obj)
        return this
    }
    this.where = function(field, op, str) {
    }
    this.db = function(table) {
        if (this.hash[table] === undefined) 
            this.hash[table] = [];
        this._activetable = table;
        return this
    }    
}
var dbo = new DB;
var db = dbo.db;

var store_memory = function() {
}
module.exports = exports = dbcommon;
