var lib = require('../lib/utils');
var assert = require('chai').assert;

test('normalize username lookup',function(done) {
    assert.equal(lib.normalizeUsername('zip-Zap'),'zipzap');
    done();
});
