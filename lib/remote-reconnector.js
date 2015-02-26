var reporter = require('./reporter')
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
            //reporter.log("Diff:",diff)
            // this is the artificial closed based on lack of ledger events
            if (diff > 35*1000)
                foo.emit('closed')
            else
                foo.emit('open')
        }
        else
            foo.emit('closed')
    }
    foo.on('closed',function() {
        reporter.log("remote-reconnector: remote closed")
        state = 'closed'
//        if ((attempting_reconnect === false) && (remote.state !== 'online')) {
        if (attempting_reconnect === false) {
            attempting_reconnect = true
            reporter.log("remote-reconnector: issuing disconnect")
            remote.disconnect(function() {
                reporter.log("remote-reconnector: disconnected. Requesting connect")
                remote.connect(function(){
                    foo.emit('open')
                    reporter.log("remote-reconnector: re-connected ", remote._servers[0]._remoteAddress());
                });
            })
        }
    })
    foo.on('open',function() {
        //reporter.log("remote-reconnector: remote open")
        attempting_reconnect = false;
        state = 'open'
    })
    foo.on('ledger_closed',function(data) {
        //reporter.log("remote-reconnector: ledger-closed event")
        var time = new Date().getTime()
        heartbeats.push({time:time})
        if (heartbeats.length > 10) {
            heartbeats.shift()
        }
    })
    remote.on('disconnect',function() {
        reporter.log("remote-reconnector: I'm disconnected");
        // this is the natural closed based on the underlying server reporting a disconnect
        foo.emit('closed')
    });
    remote.once('connect',function() {
        reporter.log("remote-reconnector: I'm connected");
        attempting_reconnect = false
        setInterval(check,5*1000)
    });
    reporter.log("remote-reconnector: Initiating ripple-lib remote connection to ripple-d")
    remote.connect(function() {
        reporter.log("remote-reconnector: Connected!", remote._servers[0]._remoteAddress())
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
