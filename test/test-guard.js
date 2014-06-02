var config = require('../config');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store)
var QL = require('queuelib')
var assert = require('chai').assert

test('test-fund-locked', function(done) {
    var q = new QL;
    q.series([
    function(lib) {
        store.db('campaigns')
        .truncate()
        .then(function() {
            var obj = {address:'rwUNHL9AdSupre4tGb7NXZpRS1ift5sR7W',
            last_emailed:1400762460231,
            start_time:1400762460219,
            campaign:'fund-name',
            isFunded:false,
            locked:'30 day not funded'}
            lib.set({obj:obj})
            lib.done()
        })
    },
    function(lib) {
        store.db('campaigns')
        .insert(lib.get('obj'))
        .then(function(resp) {
            lib.done()
        })
    },
    function(lib) {
        var obj = lib.get('obj')
        guard.locked_check(obj.address,function(isLocked,reason) {
            assert.equal(isLocked,true,'should be locked')
            assert.equal(reason,'30 day not funded','reason')
            lib.done()
        })
    },
    function(lib) {
        guard.locked_check('non-existant',function(isLocked,reason) {
            assert.equal(isLocked,false,'non-existant is considered not locked')
            assert.equal(reason,undefined)
            lib.done()
        })
    },
    function(lib) {
        var obj = lib.get('obj')
        obj.locked = ''
        lib.set({obj:obj})
        store.db('campaigns')
        .truncate()
        .then(function() {
            return store.db('campaigns')
            .insert(obj)
            .then()
        })
        .then(function(resp) {
            guard.locked_check(obj.address,function(isLocked,reason) {
                assert.equal(isLocked,false,'should not be locked')
                assert.equal(reason,undefined)
                lib.done()
            })
        })
    },
    function(lib) {
        // check that isFunded overrides any locked status
        var obj = lib.get('obj')
        obj.locked = '30 day'
        obj.isFunded = true
        store.db('campaigns')
        .truncate()
        .then(function() {
            return store.db('campaigns')
            .insert(obj)
            .then()
        })
        .then(function(resp) {
            guard.locked_check(obj.address,function(isLocked,reason) {
                assert.equal(isLocked,false,'should not be locked')
                assert.equal(reason,undefined)
                lib.done()
                done()
            })
        })
    }
    ])
})
