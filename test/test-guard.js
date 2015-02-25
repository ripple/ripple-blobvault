var config = require('../config');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store);
var assert = require('chai').assert;

var obj = {
  address:'rwUNHL9AdSupre4tGb7NXZpRS1ift5sR7W',
  last_emailed:1400762460231,
  start_time:1400762460219,
  campaign:'fund-name',
  isFunded:false,
  locked:'30 day not funded'
};

suite('Test Guard', function() {

  // Setup the Suite server and truncate db
  suiteSetup(function(done) {
    store.db('campaigns')
    .truncate()
    .then(function() {
      store.db('campaigns')
      .insert(obj)
      .then(function(resp) {
        done();
      });
    });
  });

  test('test-fund-locked', function(done) {
    guard.locked_check(obj.address,function(isLocked,reason) {
      assert.equal(isLocked,true,'should be locked');
      assert.equal(reason,'30 day not funded','reason');
      done();
    });
  });

  test('Non existant', function(done) {
    guard.locked_check('non-existant',function(isLocked,reason) {
      assert.equal(isLocked,false,'non-existant is considered not locked');
      assert.equal(reason,undefined);
      done();
    });
  });

  test('Guard should lock when locked true', function(done) {
    obj.locked = '';
    store.db('campaigns')
    .truncate()
    .then(function() {
      return store.db('campaigns')
      .insert(obj);
    })
    .then(function(resp) {
      guard.locked_check(obj.address,function(isLocked,reason) {
        assert.equal(isLocked,false,'should not be locked');
        assert.equal(reason,undefined);
        done();
      });
    });
  });

  test('isFunded should override locked', function(done) {
    obj.locked = '30 day'
    obj.isFunded = true
    store.db('campaigns')
    .truncate()
    .then(function() {
      return store.db('campaigns')
      .insert(obj);
    })
    .then(function(resp) {
      guard.locked_check(obj.address,function(isLocked,reason) {
        assert.equal(isLocked,false,'should not be locked');
        assert.equal(reason,undefined);
        done();
      });
    });
  });

});
