var argv = require('optimist')
    .usage('Usage: $0 -f [file] -m [insert|remove]')
    .demand('f')
    .describe('f','file to read in that is google exported tab separated value tsv')
    .alias('f','file')
    .argv;
var fs = require('fs');
var cw = fs.readFileSync(argv.f);
var utils = require('../lib/utils')
var QL = require('queuelib')
var q = new QL;

var lines = cw.toString().split('\n');
var lines2 = [];
var config = require('../config');
var store = require('../lib/store')(config.dbtype);

var deleted = [];

    q.forEach(lines,function(item,idx,lib) {
        var data = item.split('\t');
        if ((data.length) && (data.length >= 3) && (data[2] == 'yes') && (data[0].indexOf('r') != -1)) {
            data[1] = data[1].replace("~","")
            lines2.push(data);
        }
        lib.done()
    }, function() {
        delete_cold_wallets()
    })

    function delete_cold_wallets () {
        q.forEach(lines2,function(line,idx,lib) {
            var genid = (Math.random() + 1).toString(36).substring(7)
            var obj = { id:'coldwallet_'+genid,address: line[0], username:line[1] }
            store.read_where({key:'username',value:line[1]},function(resp) {
                if (resp.length) {
                    var row = resp[0];
                    if ((row.blob == null) && (row.id.substr(0,4) == 'cold')) {
                        
                        store.delete_where({table:'blob',where:{key:'username',value:row.username}},function(resp) {
                            deleted.push({username:row.username, address:row.address})
                            lib.done()
                        })
                    } else
                        lib.done()
                } else
                    lib.done() 
            })
            
/*
            store.delete_where({table:'blob',where:{key:'username',value:line[1]}},
            function(resp) {
                if (resp === 1) 
                    success.push(line)
                else if (resp === 0)
                    failure.push(line)
                lib.done()
            })
*/
        },
        function() {
            console.log("Deleted:", deleted)
        })
    }

