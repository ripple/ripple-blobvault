var EC = require('./emailcampaign');
var config = require('./config');
var QL = require('queuelib');
var Knex = require('knex');
var user_a = {"username":"Seelan","auth_secret":"FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A","id":"fffd0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a","data":"Zm9v","address":"rwUNHL9AdSupre4tGb7NXZpRS1ift5sR7W","email":"bob5050@bob.com","hostlink":"http://localhost:8080/activate","encrypted_secret":"r5nUDJLNQfWERYFm1sUSxxhate8r1q","encrypted_blobdecrypt_key":"asdfasdfasdf"};
var user_b = {"username":"Palleen","auth_secret":"FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A","id":"ffef0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a","data":"Zm9v","address":"rJdWmijaRPvHZ9M9PNAqhs88nTnYivTZtq","email":"woot@woot.com","hostlink":"http://localhost:8080/activate","encrypted_secret":"r5nUDJLNQfWERYFm1sUSxxhate8r1q","encrypted_blobdecrypt_key":"asdfasdfasdf"};

var db = Knex.initialize({
    client: 'postgres',
    connection : config.database.postgres
});

var q = new QL;
q.series([

function(lib) {
    db('campaigns')
        .truncate()
        .then(function() {
            return db('blob')
            .truncate()
            .then(function() {
                lib.done();
            })
        })
        .catch(function(e) {
            console.log(e);
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
    var ec = new EC(db,config)
    ec.start(function() {
        console.log("Connected");
        lib.done();
    });
}
])
