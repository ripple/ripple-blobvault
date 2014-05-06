var Hash = require('hashish');
var config = require('../config');
var RL = require('ripple-lib');
var Knex = require('knex');
var knex = Knex.initialize({
    client: 'postgres',
    connection : config.database.postgres
});
var UInt160 = RL.UInt160;
var remote = new RL.Remote(config.ripplelib);
remote.connect();



{"username":"bob-5050","auth_secret":"FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A","blob_id":"fffd0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a","data":"Zm9v","address":"rwUNHL9AdSupre4tGb7NXZpRS1ift5sR7:","email":"bob5050@bob.com","hostlink":"http://localhost:8080/activate","date":"april","encrypted_secret":"r5nUDJLNQfWERYFm1sUSxxhate8r1q","encrypted_blobdecrypt_key":"asdfasdfasdf"}

{"username":"mycatcupid","auth_secret":"FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A","blob_id":"ffef0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a","data":"Zm9v","address":"rJdWmijaRPvHZ9M9PNAqhs88nTnYivTZtq","email":"woot@woot.com","hostlink":"http://localhost:8080/activate","date":"april","encrypted_secret":"r5nUDJLNQfWERYFm1sUSxxhate8r1q","encrypted_blobdecrypt_key":"asdfasdfasdf"}

checkLedger = function(address,cb) {
    if (UInt160.is_valid(address) == false) {
        console.log("Not a valid ripple address!");
        cb(false);
        return
    }
    if (config.testmode) {
        cb(true);
        return
    }
    remote.request_account_tx({forward:true,limit:1,ledger_index_min:-1,ledger_index_max:-1,account:address},function(err,resp){
        if ((!err) && (resp) && (resp.transactions) && (resp.transactions.length)) {
            var firsttx = resp.transactions.pop();
            var time = RL.utils.time.fromRipple(firsttx.tx.date);
            console.log("TIME TX DAY :" + new Date(time).toDateString());
            var cutofftime = new Date(config.nolimit_date).getTime();
            console.log("Cutoff Time:" + new Date(cutofftime).toDateString());
            var proceed = (time <= cutofftime);
            console.log("Time first Tx:" + time + " vs cutofftime:" + cutofftime + " proceed? " + proceed);
            cb(time <= cutofftime) 
        } else
            cb(false)
    });
}
remote.on('connect',function() {
    knex('blob')
        .select() 
        .then(function(rows) {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                checkLedger(row.address,function(isFunded) {
                    console.log("Is Funded?:" + isFunded);
                });
            }
        });
});

