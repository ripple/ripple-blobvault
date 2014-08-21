var Queue = require('queuelib')
var config = require('../config');
var store = require('../lib/store')(config.dbtype);
var conformParams = require('../lib/conformParams')

    var identity_id = '1234'
    var q = new Queue
    q.series([
    function(lib) {
        store.read_where({table:'identity_attributes',key:'identity_id', value:identity_id},
        function(resp) {
            lib.set({attributes:resp})
            lib.done()
        });
    },
    function(lib) {
        store.read_where({table:'identity_addresses',key:'identity_id', value:identity_id},
        function(resp) {
            lib.set({addresses:resp})
            lib.done()
        });
    },
    function(lib) {
        //get from query string params for now
        var data = {addresses:lib.get('addresses'),attributes:lib.get('attributes')} 
        var result = conformParams(data);
    }
    ])
