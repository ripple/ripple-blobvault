var argv = require('optimist')
    .usage('Usage: $0 -f [file] -m [insert|remove]')
    .demand('f')
    .describe('f','file to read in that is google exported tab separated value tsv')
    .alias('f','file')
    .demand('m')
    .describe('m', 'insert | remove')
    .alias('m', 'mode')
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

if (argv.m == 'insert') {
    q.forEach(lines,function(item,idx,lib) {
        var data = item.split('\t');
        if ((data.length) && (data.length >= 3) && (data[2] == 'yes') && (data[0].indexOf('r') != -1)) {
            data[1] = data[1].replace("~","")
            lines2.push(data);
        }
        lib.done()
    }, function() {
        insert_cold_wallets()
    })

    function insert_cold_wallets () {
        var success = [];
        var failure = [];
        q.forEach(lines2,function(line,idx,lib) {
            var genid = (Math.random() + 1).toString(36).substring(7)
            var obj = { id:'coldwallet_'+genid,address: line[0], normalized_username:utils.normalizeUsername(line[1]),username:line[1] }
            store.read_where({key:'address',value:line[0]},function(list) {
                console.log("read where result:",list)
                if (list.length) {
                    console.log("user already exists.. so deleteing pre-generated id")
                    delete obj.id;
                    var blob = list[0];
                    if ((!blob['encrypted_blobdecrypt_key']) || (blob['encrypted_blobdecrypt_key'] == '')) {
                        console.log("user does NOT have encrypted blobdecrpyt key. Skipping")
                        failure.push(obj)
                        
                        lib.done();
                        return;
                    }
                } else {
                    console.log("going with new generated id") 
                }
                store.insert_or_update_where({table:'blob',where:{key:'address',value:line[0]},set:obj
                },
                function(resp) {
                    if ((resp.result) && (resp.result == 'success')) {
                        if (list.length) 
                            obj.oldusername = list[0].username;
                        success.push(obj)
                    } else 
                        failure.push(obj)
                    lib.done()
                })
            })
        },
        function() {
            console.log("All done. inserted " + success.length + " cold wallets")
            console.log("successes:", success)
            console.log("failures:", failure)
        })
    }
} else if (argv.m == 'remove') {
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
        var success = [];
        var failure = [];
        q.forEach(lines2,function(line,idx,lib) {
            var genid = (Math.random() + 1).toString(36).substring(7)
            var obj = { id:'coldwallet_'+genid,address: line[0], username:line[1] }
            store.delete_where({table:'blob',where:{key:'username',value:line[1]}},
            function(resp) {
                if (resp === 1) 
                    success.push(line)
                else if (resp === 0)
                    failure.push(line)
                lib.done()
            })
        },
        function() {
            console.log("All done. deleted " + success.length + " cold wallets")
            console.log("successes:", success)
            console.log("failures:", failure)
        })
    }
}

