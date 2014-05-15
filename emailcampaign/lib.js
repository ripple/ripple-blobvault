var RL = require('ripple-lib');
var UInt160 = RL.UInt160;
var scan = function(db,cb) {
    db('blob')
        .join('campaigns','blob.address','=','campaigns.address','LEFT OUTER')
        .where('campaigns.isFunded','=',null)
        .orWhere('campaigns.isFunded','=',false)
        .select('blob.address','campaigns.last_emailed','campaigns.campaign','campaigns.isFunded')
        .then(function(rows) {
            cb(rows);
        })
        .catch(function(e) {
            console.log("Caught E:", e);
        });
}
exports.scan = scan
var checkLedger = function(address,remote,cb) {
    console.log("checkLedger:" + address);
    if (UInt160.is_valid(address) == false) {
       console.log("Not a valid ripple address!" + address);
        cb(false);
        return
    }
    remote.request_account_tx({forward:true,limit:1,ledger_index_min:-1,ledger_index_max:-1,account:address},function(err,resp){
        console.log(arguments)
        if ((!err) && (resp) && (resp.transactions) && (resp.transactions.length))
            cb(true) 
        else
            cb(false)
    });
}
exports.checkLedger = checkLedger
var getByDuration = function(days,rows) {
//    console.log("Days:" , days,rows);
};
exports.getByDuration = getByDuration
