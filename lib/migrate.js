module.exports = exports = function(knex,done) {
    var QL = require('queuelib');
    var date =  new Date();
    var curr_date = date.toString();
    var curr_time = date.getTime();
    var q = new QL;
    q.series([
        function(lib) {
            knex.schema.hasTable('blob').then(function(exists) {
                if (!exists) 
                    knex.schema
                    .createTable('blob', function (table) {
                        table.string('id').primary();
                        table.string('address').unique()
                        table.string('auth_secret');
                        table.integer('revision');
                        table.binary('data');
                        table.string('encrypted_blobdecrypt_key');
                        table.integer('quota').defaultTo(0);
                        table.string('username').unique()
                        table.string('normalized_username').unique();
                        table.boolean('email_verified');
                        table.string('email');
                        table.string('email_token');
                        table.string('hostlink');
                        table.string('encrypted_secret');
                        // e.g. Tue Jun 03 2014 08:57:58 GMT-0700 (PDT)
                        // on staging and production these are GMT 000 
                        table.string('create_date').defaultTo(curr_date)
                        table.bigInteger('create_timestamp').defaultTo(curr_time) 
                        table.string('phone')
                        table.string('country')
                        table.string('region')
                        table.string('city') 
                        table.string('domain')
                    })
                    .then(function () {
                        console.log('blob table is created in database blobvault');
                        lib.done();
                    });
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasTable('blob_patches').then(function(exists) {
                if (!exists) 
                    knex.schema
                    .createTable('blob_patches', function (table) {
                        table.increments('id').primary();
                        table.string('blob_id');
                        table.integer('revision');
                        table.binary('data');
                        // size in bytes before base64 conversion
                        table.integer('size').defaultTo(0);
                    })
                    .then(function () {
                        console.log('blob_patches table is created in database blobvault');
                        lib.done();
                    });
                else 
                    lib.done()
            });
        },
        function(lib) {
            // this is logging
            knex.schema.hasTable('log').then(function(exists) {
                if (!exists) 
                    knex.schema
                    .createTable('log', function (table) {
                        // 'date' is this (day-by-day)
                        // var x = new Date(); x.toDateString();
                        //'Thu Apr 24 2014'
                        table.string('date'); 

                        // full date is for readability
                        // var x = new Date(); 
                        // Thu Apr 24 2014 03:41:38 GMT-0700 (PDT)
                        table.string('fulldate');
                       
                        // currtime is
                        // x.getTime(); 
                        // > 1398336098552
                        table.string('currtime');
                
                        // 'number' is the order number that the user was created
                        // e.g. 1 is the first user signup of that date
                        table.string('number');
                
                        table.boolean('isAccepted');
                        table.boolean('isRejected');

                        // isFunded refers to config.nolimit_cutoffdate
                        table.boolean('isFunded');
                    })
                    .then(function () {
                        console.log('log table is created in database blobvault');
                        lib.done()
                    });
                else 
                    lib.done()
            });
        },
        function(lib) {
            knex.schema.hasTable('campaigns').then(function(exists) {
                if (!exists) 
                    knex.schema
                    .createTable('campaigns', function (table) {
                        table.string('address').unique()
                        // timestamp 
                        table.bigInteger('last_emailed')
                        table.bigInteger('start_time')
                        table.string('campaign')
                        table.boolean('isFunded')
                        table.string('locked').defaultTo('');
                    })
                    .then(function () {
                        console.log('campaigns table is created in database blobvault');
                        lib.done()
                    });
                else 
                    lib.done()
            });
        },
        function(lib) {
            knex.schema.hasColumn('log', 'isFunded').then(function(exists) {
                console.log("isFunded exists:",exists);
                if (!exists) 
                    knex.schema.table('log', function (table) {
                        table.boolean('isFunded');
                    }).then(function() {
                        console.log('\tadded isFunded');
                        lib.done();
                    })
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'address').then(function(exists) {
                console.log("address exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.unique('address');
                    }).then(function() {
                        console.log('\tadded address');
                        lib.done();
                    })
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'encrypted_secret').then(function(exists) {
                console.log("encrypted_Secret exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('encrypted_secret');
                    }).then(function() {
                        console.log('\tadded encrypted_secret');
                        lib.done();
                    })
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'quota').then(function(exists) {
                console.log("quota exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.integer('quota').defaultTo(0);
                    }).then(function() {
                        console.log('\tadded quota');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'encrypted_blobdecrypt_key').then(function(exists) {
                console.log("encrypted_blobdecrypt_key exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('encrypted_blobdecrypt_key');
                    }).then(function() {
                        console.log('\tadded encrypted_blobdecrypt_key');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob_patches', 'size').then(function(exists) {
                console.log("size exists:",exists);
                if (!exists) 
                    knex.schema.table('blob_patches', function (table) {
                        // size in bytes before base64 conversion
                        table.integer('size').defaultTo(0);
                    }).then(function() {
                        console.log('\tadded size');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'normalized_username').then(function(exists) {
                console.log("normalized_username:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('normalized_username').unique();
                    }).then(function() {
                        console.log('\tadded normalized_username');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('campaigns', 'locked').then(function(exists) {
                console.log("locked:",exists);
                if (!exists) 
                    knex.schema.table('campaigns', function (table) {
                        table.string('locked').defaultTo('');
                    }).then(function() {
                        console.log('\tadded locked');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasTable('locked_users').then(function(exists) {
                if (!exists) 
                    knex.schema
                    .createTable('locked_users', function (table) {
                        table.string('id').primary();
                        table.string('address').unique()
                        table.string('auth_secret');
                        table.integer('revision');
                        table.binary('data');
                        table.string('encrypted_blobdecrypt_key');
                        table.integer('quota').defaultTo(0);
                        table.string('username').unique()
                        table.string('normalized_username').unique();
                        table.boolean('email_verified');
                        table.string('email');
                        table.string('email_token');
                        table.string('hostlink');
                        table.string('encrypted_secret');
                        table.string('create_date').defaultTo(curr_date)
                        table.bigInteger('create_timestamp').defaultTo(curr_time) 
                        table.string('phone')
                        table.string('country')
                        table.string('region')
                        table.string('city') 
                        table.string('domain')
                    })
                    .then(function () {
                        console.log('locked_users is created in database blobvault');
                        lib.done();
                    });
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'domain').then(function(exists) {
                console.log("domain exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('domain').defaultTo('rippletrade.com');
                    }).then(function() {
                        console.log('\tadded domain');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'create_date').then(function(exists) {
                console.log("create_date exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('create_date').defaultTo(curr_date)
                    }).then(function() {
                        console.log('\tadded create_date');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'create_timestamp').then(function(exists) {
                console.log("create_timestamp exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.bigInteger('create_timestamp').defaultTo(curr_time)
                    }).then(function() {
                        console.log('\tadded create_timestamp');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'phone').then(function(exists) {
                console.log("phone exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('phone')
                    }).then(function() {
                        console.log('\tadded phone');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'country').then(function(exists) {
                console.log("country exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('country')
                    }).then(function() {
                        console.log('\tadded country');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'region').then(function(exists) {
                console.log("region exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('region')
                    }).then(function() {
                        console.log('\tadded region');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'city').then(function(exists) {
                console.log("city exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('city')
                    }).then(function() {
                        console.log('\tadded city');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            lib.done();
            done();
        }
    ]);
};
