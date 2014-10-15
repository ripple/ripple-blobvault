var config = require('../config');
var store = require('../lib/store')(config.dbtype);
var assert = require('assert')

var QL = require('queuelib')

var q = new QL;

q.series([
function(lib) {
    store.db.raw('select version()').then(function(resp) {
        console.log("VERSION:", resp)
        lib.done();
    });
},
function(lib) {
    store.db('attestations')
    .truncate()
    .then(function() {
      return store.db('attestations')
      .insert({id:'catcat',payload:{foo:'bar',life:42,animal:{cat:'gabby'}}})
    })
    .then(function() {
        lib.done()
    });     
},
function(lib) {
    store.db('attestations')
    .whereRaw("payload->>'life' = ?", 42)
    .select()
    .then(function(resp) {
        assert.equal(84,resp[0].payload.life*2)
        assert.equal('gabby',resp[0].payload.animal.cat)
        console.log("all done")
        lib.done()
        process.exit()
    })
}
])

