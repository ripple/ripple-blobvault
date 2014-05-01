suite('count limiter', function() {
    // this resets the global Date
    var sinon = require('sinon');
    var assert = require('chai').assert;
    var clock = sinon.useFakeTimers();

    var Counter = require('../lib/counter');
    var count = new Counter;
    test('we should have a thousand count',function(done) {
        for (var i = 0; i < 1004; i++) {
            count.add()
            var chk = count.check();
            if (i >= 1000)
                assert.equal(chk, false,'after 1000, no more')
            else 
                assert.equal(chk, true,'the first 1000 work')
        }
        for (var i = 0; i < 1004; i++) {
            count.add()
            var chk = count.check();
            assert.equal(chk,false,'the next thousand or so should fail')
        }
        var oneday = 1000*60*60*24;
        clock.tick(oneday+1);
        for (var i = 0; i < 1004; i++) {
            count.add()
            var chk = count.check();
            if (i >= 1000)
                assert.equal(chk, false,'after one day, after 1000 fail')
            else 
                assert.equal(chk, true,'after one day, the first 1000 work')
        }
        done();
    });
    teardown(function () {
        clock.restore();
    });
});
