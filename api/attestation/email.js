var reporter  = require('../../lib/reporter');
var request   = require('request');
var response  = require('response');
var utils     = require('../../lib/utils');
var Queue     = require('queuelib');

exports.store;

exports.setStore = function(s) {
  exports.store  = s;
  reporter.store = s;
};

exports.get = function(req,res,next) {
};