var obj = {
    integration: {
        client: 'postgresql',
        connection: {
            database: 'my_db',
            user:     'username',
            password: 'password'
        }
    },
    staging: {
        client: 'postgresql',
        connection: {
            database: 'my_db',
            user:     'username',
            password: 'password'
        }
    },
    production: {
        client: 'postgresql',
        connection: {
            database: 'my_db',
            user:     'username',
            password: 'password'
        }
    }
};
// some call it integration
obj.development = obj.integration;
module.exports = exports = obj;
