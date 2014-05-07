var scan = function(db,done) {
    db('blob')
        .select()
        .then(function(rows) {
            console.log(rows);
            // for each user, check memo table
            // if memo result is empty
            //    do lookup for tx on ripplelib -> record result in memo table
            //    mark as funded or unfunded, plus date of check
            // else get funded or unfunded result and date of check
            // if unfunded, send email
                
            done();
        });
}
var Campaign = function(db,schedule) {
    this.checktimer;
    this.working = false;
    this.work = function() {
        this.working = true;
        // do some work... evetually call working = false
        console.log("Doing work.");
        var cb = function() {
            console.log("All done.");
            this.working = false;
            this.check();
        }
        
        scan(db,cb.bind(this));
    };
    this.check = function() {
        var now = new Date();
        var timetill = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.hour, schedule.minute, 0, 0) - now;
        if (timetill < 0) 
            timetill += 86400000; // one day
        console.log("Time till next email campaign service:" + ~~(timetill / (60*1000)) + " minutes");
        this.checktimer = setTimeout(this.work.bind(this),timetill);
    };
    this.start = function() {
        console.log("starting services.");
        this.check();
    };
    this.stop = function() {
        console.log("stopping email campaign");
        clearTimeout(this.checktimer);
    };
};

module.exports = exports = Campaign;



