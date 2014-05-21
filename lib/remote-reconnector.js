module.exports = exports = function(remote) {
    var heartbeats = [];
    var attempting_reconnect = false;
    var ee = require('events').EventEmitter;
    var foo = new ee;
    var state = '';
    var check = function() {
        var len = heartbeats.length
        var curr = new Date().getTime()
        if (len) {
            var diff = curr - heartbeats[len-1].time
            //console.log("Diff:",diff)
            if (diff > 12*1000)
                foo.emit('closed')
            else 
                foo.emit('open')
        }
        else 
            foo.emit('closed')
    }
    foo.on('closed',function() {
        //console.log("remote-reconnector: remote closed")
        state = 'closed'
        if (attempting_reconnect === false) {
            console.log("remote-reconnector: issuing disconnect")
            remote.disconnect(function() {
                console.log("remote-reconnector: disconnected. Requesting connect")
                attempting_reconnect = true
                remote.connect(function(){ 
                    console.log("remote-reconnector: connected")
                });
            })
        }
    })
    foo.on('open',function() {
        //console.log("remote-reconnector: remote open")
        state = 'open'
    })
    foo.on('ledger_closed',function(data) {
        var time = new Date().getTime()
        heartbeats.push({time:time})
        if (heartbeats.length > 10) {
            heartbeats.shift()
        }
    })
    remote.on('disconnect',function() {
        console.log("remote-reconnector: I'm disconnected");
    });
    remote.once('connect',function() {
        console.log("remote-reconnector: I'm connected");
        attempting_reconnect = false
        setInterval(check,5*1000)
    });
    remote.connect(function() {
        remote.on('ledger_closed', function(data) {
            foo.emit('ledger_closed',data)
        })
    });
    return {
        state : function() {
            return state
        }
    }
}
