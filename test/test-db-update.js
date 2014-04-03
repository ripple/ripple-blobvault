var Queuelib = require('queuelib');
var queue = new Queuelib;
var store = require('../lib/store')('memory');
queue.series([
function(lib) {
    store.create({ 
    username : 'bob',
    auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
    blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
    data : 'foo' ,
    address : 'r24242',
    email: 'bob@foo.com'
    },function(res) {
        console.log(res);
        lib.done();
    });
},
function(lib) {
    store.update({username:'bob',hash:{email:"bob@yahoo.com",address:"r1337"}}, function(res) {
        console.log(res);
        lib.done();
    });
},
function(lib) {
    store.read({username:'bob'},function(resp) {
        console.log(resp);
        lib.done();
    });
}
])
