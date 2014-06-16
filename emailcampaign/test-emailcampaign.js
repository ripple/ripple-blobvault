var reporter = require('../lib/reporter');
var EC = require('../emailcampaign');
var config = require('../config');
var QL = require('queuelib');
var Knex = require('knex');

var assert = require('assert');

var user_a = {"username":"Seelan","auth_secret":"FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A","id":"fffd0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a","data":"Zm9v","address":"rwUNHL9AdSupre4tGb7NXZpRS1ift5sR7W","email":"bob@bob.com","hostlink":"http://localhost:8080/activate","encrypted_secret":"r5nUDJLNQfWERYFm1sUSxxhate8r1q","encrypted_blobdecrypt_key":"asdfasdfasdf"};
var user_b = {"username":"Palleen","auth_secret":"FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A","id":"ffef0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a","data":"Zm9v","address":"rJdWmijaRPvHZ9M9PNAqhs88nTnYivTZtq","email":"rook2pawn@gmail.com","hostlink":"http://localhost:8080/activate","encrypted_secret":"r5nUDJLNQfWERYFm1sUSxxhate8r1q","encrypted_blobdecrypt_key":"asdfasdfasdf"};

var db = Knex.initialize({
    client: 'postgres',
    connection : config.database.postgres
});
var ec = new EC(db,config)
var DAY = 1000*60*60*24;

var donecount = 0;

var actionhistory = [];
var probe = function(data) {
    switch (data.action) {
        case 'check':
        reporter.log("Time till next check:"+ (data.timetill/(1000*60)) + " minutes")
        break;
        default :
        reporter.log("Unspecified case",data)
        break;
    }
    if ((data.row) && (data.row.username == user_b.username)) {
        actionhistory.push(data.action)
        reporter.log("ACTION HISTORY:" ,actionhistory)
        if ((actionhistory.length == 2) && (actionhistory[actionhistory.length -1] == 'initial notice')) {
            // test 7 day notice
            ec._forcework(23.2*(1000*60*60*24))
        } else if ((actionhistory.length == 4) && (actionhistory[actionhistory.length -1] == '7 day notice')) {
            // test 2 day notice
            ec._forcework(28.2*(1000*60*60*24))
        } else if ((actionhistory.length == 6) && (actionhistory[actionhistory.length -1] == '2 day notice')) {
            // test locked
            ec._forcework(30.2*(1000*60*60*24))
            // after this, then testuser Palleen should be moved from blob to locked_users table
        } else if ((actionhistory.length == 8) && (actionhistory[actionhistory.length -1] == 'locked')) {
            // now we check that user Palleen is moved
            db('blob')
                .where('username','=',user_b.username)
                .select()
                .then(function(resp) {
                    reporter.log("Checking that pallen is removed from blob", resp)
                    assert.equal(resp.length,0)
                })
                .then(function() {
                    reporter.log("Now checking that palleen is moved to locked_users")
                    db('locked_users')
                    .where('username','=',user_b.username)
                    .select()
                    .then(function(resp) {
                        reporter.log("RESP LENGTH should be 1", resp.length)
                        assert.equal(resp.length, 1)
                    })
                })
        }
    }
};
ec.probe_subscribe(probe)

var q = new QL;
q.series([
function(lib) {
    db('campaigns')
        .truncate()
        .then(function() {
            return db('locked_users')
            .truncate()
            .then()
        })
        .then(function() {
            return db('blob')
            .truncate()
            .then(function() {
                lib.done();
            })
        })
        .catch(function(e) {
            reporter.log(e);
        });
},
function(lib) {
    db('blob')
    .insert(user_a)
    .then(function() {
        return db('blob')
        .insert(user_b)
        .then(function() {
            lib.done()
        })
    })
},
function(lib) {
    ec.start(function() {
        reporter.log("Connected");
        lib.done();
    },true); // add test override
},
function(lib) {
    lib.done()
}
])
