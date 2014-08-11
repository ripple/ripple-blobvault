var reporter = require('./reporter')
module.exports = exports = function(knex,done) {
    var QL = require('queuelib');
    var date =  new Date();
    var curr_date = date.toString();
    var curr_time = date.getTime();
    var q = new QL;
    q.series([
        function(lib) {
            knex.schema.hasTable('twofactor').then(function(exists) {
                if (!exists) 
                    knex.schema
                    .createTable('twofactor', function (table) {
                        table.string('blob_id');
                        table.boolean('is_auth');
                        table.string('device_id');
                        table.boolean('remember_me');
                        table.bigInteger('last_auth_timestamp');
                    })
                    .then(function () {
                        reporter.log('twofactor table is created in database blobvault');
                        lib.done();
                    });
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('twofactor', 'remember_me').then(function(exists) {
                if (!exists) {
                    knex.schema.table('twofactor',function(table) {
                        table.boolean('remember_me');
                    })
                    .then(function() {
                        reporter.log("added remember_me to twofactor")
                        lib.done()
                    })
                } else 
                lib.done()
            })
        },
        function(lib) {
            knex.schema.hasTable('name_change_history').then(function(exists) {
                if (!exists) 
                    knex.schema
                    .createTable('name_change_history', function (table) {
                        table.string('address');
                        table.string('from_username');
                        table.string('to_username');
                        table.bigInteger('timestamp');
                        // full date is for readability
                        // var x = new Date(); 
                        // Thu Apr 24 2014 03:41:38 GMT-0700 (PDT)
                        table.string('fulldate');
                    })
                    .then(function () {
                        reporter.log('name_change_history table is created in database blobvault');
                        lib.done();
                    });
                else 
                    lib.done();
            });
        },
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
                        reporter.log('blob table is created in database blobvault');
                        lib.done();
                    });
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', '2fa_auth_id').then(function(exists) {
                if (!exists) {
                    knex.schema.table('blob',function(table) {
                        table.string('2fa_auth_id');
                    })
                    .then(function() {
                        reporter.log("added auth_id to blob")
                        lib.done()
                    })
                } else 
                lib.done()
            })
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
                        reporter.log('blob_patches table is created in database blobvault');
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
                        reporter.log('log table is created in database blobvault');
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
                        reporter.log('campaigns table is created in database blobvault');
                        lib.done()
                    });
                else 
                    lib.done()
            });
        },
        function(lib) {
            knex.schema.hasColumn('log', 'isFunded').then(function(exists) {
                reporter.log("isFunded exists:",exists);
                if (!exists) 
                    knex.schema.table('log', function (table) {
                        table.boolean('isFunded');
                    }).then(function() {
                        reporter.log('\tadded isFunded');
                        lib.done();
                    })
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'address').then(function(exists) {
                reporter.log("address exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.unique('address');
                    }).then(function() {
                        reporter.log('\tadded address');
                        lib.done();
                    })
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'encrypted_secret').then(function(exists) {
                reporter.log("encrypted_Secret exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('encrypted_secret');
                    }).then(function() {
                        reporter.log('\tadded encrypted_secret');
                        lib.done();
                    })
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'quota').then(function(exists) {
                reporter.log("quota exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.integer('quota').defaultTo(0);
                    }).then(function() {
                        reporter.log('\tadded quota');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'encrypted_blobdecrypt_key').then(function(exists) {
                reporter.log("encrypted_blobdecrypt_key exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('encrypted_blobdecrypt_key');
                    }).then(function() {
                        reporter.log('\tadded encrypted_blobdecrypt_key');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob_patches', 'size').then(function(exists) {
                reporter.log("size exists:",exists);
                if (!exists) 
                    knex.schema.table('blob_patches', function (table) {
                        // size in bytes before base64 conversion
                        table.integer('size').defaultTo(0);
                    }).then(function() {
                        reporter.log('\tadded size');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'normalized_username').then(function(exists) {
                reporter.log("normalized_username:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('normalized_username').unique();
                    }).then(function() {
                        reporter.log('\tadded normalized_username');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('campaigns', 'locked').then(function(exists) {
                reporter.log("locked:",exists);
                if (!exists) 
                    knex.schema.table('campaigns', function (table) {
                        table.string('locked').defaultTo('');
                    }).then(function() {
                        reporter.log('\tadded locked');
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
                        reporter.log('locked_users is created in database blobvault');
                        lib.done();
                    });
                else 
                    lib.done();
            });
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'domain').then(function(exists) {
                reporter.log("domain exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('domain').defaultTo('rippletrade.com');
                    }).then(function() {
                        reporter.log('\tadded domain');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'domain').then(function(exists) {
                reporter.log("domain exists:",exists);
                if (!exists) 
                    knex.schema.table('locked_users', function (table) {
                        table.string('domain').defaultTo('rippletrade.com');
                    }).then(function() {
                        reporter.log('\tadded domain');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'create_date').then(function(exists) {
                reporter.log("create_date exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('create_date').defaultTo(curr_date)
                    }).then(function() {
                        reporter.log('\tadded create_date');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'create_date').then(function(exists) {
                reporter.log("create_date exists:",exists);
                if (!exists) 
                    knex.schema.table('locked_users', function (table) {
                        table.string('create_date').defaultTo(curr_date)
                    }).then(function() {
                        reporter.log('\tadded create_date');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'create_timestamp').then(function(exists) {
                reporter.log("create_timestamp exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.bigInteger('create_timestamp').defaultTo(curr_time)
                    }).then(function() {
                        reporter.log('\tadded create_timestamp');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'create_timestamp').then(function(exists) {
                reporter.log("create_timestamp exists:",exists);
                if (!exists) 
                    knex.schema.table('locked_users', function (table) {
                        table.bigInteger('create_timestamp').defaultTo(curr_time)
                    }).then(function() {
                        reporter.log('\tadded create_timestamp');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'phone').then(function(exists) {
                reporter.log("phone exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('phone')
                    }).then(function() {
                        reporter.log('\tadded phone');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'phone').then(function(exists) {
                reporter.log("phone exists:",exists);
                if (!exists) 
                    knex.schema.table('locked_users', function (table) {
                        table.string('phone')
                    }).then(function() {
                        reporter.log('\tadded phone');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'country').then(function(exists) {
                reporter.log("country exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('country')
                    }).then(function() {
                        reporter.log('\tadded country');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'country').then(function(exists) {
                reporter.log("country exists:",exists);
                if (!exists) 
                    knex.schema.table('locked_users', function (table) {
                        table.string('country')
                    }).then(function() {
                        reporter.log('\tadded country');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'region').then(function(exists) {
                reporter.log("region exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('region')
                    }).then(function() {
                        reporter.log('\tadded region');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'region').then(function(exists) {
                reporter.log("region exists:",exists);
                if (!exists) 
                    knex.schema.table('locked_users', function (table) {
                        table.string('region')
                    }).then(function() {
                        reporter.log('\tadded region');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'city').then(function(exists) {
                reporter.log("city exists:",exists);
                if (!exists) 
                    knex.schema.table('blob', function (table) {
                        table.string('city')
                    }).then(function() {
                        reporter.log('\tadded city');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'city').then(function(exists) {
                reporter.log("city exists:",exists);
                if (!exists) 
                    knex.schema.table('locked_users', function (table) {
                        table.string('city')
                    }).then(function() {
                        reporter.log('\tadded city');
                        lib.done();
                    })
                else 
                    lib.done();
            })
        },
        function(lib) {
            knex.schema.table('blob', function (table) {
                table.dropColumn('origin');
            }).then(function() {
                reporter.log('\tdropped origin column');
                lib.done();
            })
            .catch(function(e) {
                reporter.log('\tdropped origin column error', e);
                lib.done();
            })
        },
        function(lib) {
            knex.schema.table('locked_users', function (table) {
                table.dropColumn('origin');
            }).then(function() {
                reporter.log('\tdropped origin column');
                lib.done();
            })
            .catch(function(e) {
                reporter.log('\tdropped origin column error', e);
                lib.done();
            })
        },
        function(lib) {
            knex.schema.table('locked_users', function (table) {
                table.boolean('2fa_enabled');
                table.string('2fa_phone');
                table.string('2fa_country_code');
                table.string('2fa_via');
            }).then(function() {
                reporter.log('\tadded 2fa_enabled, 2fa_phone, 2fa_country_code, 2fa_via to locked_users');
                lib.done();
            })
            .catch(function(e) {
                reporter.log('\tlocked users table already has 2fa_enabled, 2fa_phone, 2fa_country_code, 2fa_via');
                lib.done();
            })
        },
        function(lib) {
            knex.schema.table('blob', function (table) {
                table.boolean('2fa_enabled');
                table.string('2fa_phone');
                table.string('2fa_country_code');
                table.string('2fa_via');
            }).then(function() {
                reporter.log('\tAdded 2fa_enabled, 2fa_phone, 2fa_via');
                lib.done();
            })
            .catch(function(e) {
                reporter.log('\tAlready included 2fa_remember_me, 2fa_enabled, 2fa_phone, 2fa_via');
                lib.done()
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', '2fa_remember_me').then(function(exists) {
                if (exists) {
                    knex.schema.table('blob',function(table) {
                        table.dropColumn('2fa_remember_me');
                    })
                    .then(function() {
                        reporter.log("dropped 2fa_remember_me from blob")
                        lib.done()
                    })
                } else {
                    lib.done()
                }
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', '2fa_country_code').then(function(exists) {
                if (!exists) {
                    knex.schema.table('blob',function(table) {
                        table.string('2fa_country_code');
                    })
                    .then(function() {
                        reporter.log("added 2fa_country_code")
                        lib.done()
                    })
                } else 
                lib.done()
            })
        },
        function(lib) {
            knex.schema.hasColumn('locked_users', 'phone_verified').then(function(exists) {
                if (!exists) {
                    knex.schema.table('locked_users',function(table) {
                        table.boolean('phone_verified');
                    })
                    .then(function() {
                        reporter.log("added phone_verified to locked_users")
                        lib.done()
                    })
                } else 
                lib.done()
            })
        },
        function(lib) {
            knex.schema.hasColumn('blob', 'phone_verified').then(function(exists) {
                if (!exists) {
                    knex.schema.table('blob',function(table) {
                        table.boolean('phone_verified');
                    })
                    .then(function() {
                        reporter.log("added phone_verified to blob")
                        lib.done()
                    })
                } else 
                lib.done()
            })
        },
        function(lib) {
            lib.done();
            done();
        }
    ]);
};
