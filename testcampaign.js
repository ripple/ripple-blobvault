var EC = require('./lib/emailcampaign');
var config = require('./config');
var QL = require('queuelib');
var Knex = require('knex');
var db = Knex.initialize({
    client: 'postgres',
    connection : config.database.postgres
});

var q = new QL;
q.series([

function(lib) {
    db('campaigns')
        .truncate()
        .then(function(resp) {
            console.log(arguments);
            lib.done();
        })
        .catch(function(e) {
            console.log(e);
        });
},

function(lib) {
    var ec = new EC(db,config)
    ec.start(function() {
        console.log("Connected");
        lib.done();
    });
}
])
