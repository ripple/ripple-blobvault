// IP of the interface to bind to, default (null) means to bind to any
// exports.host = '127.0.0.1';
exports.host = null;

// Port to listen on
exports.port = 8080;

// SSL settings
exports.ssl = false;

// Whether this blob vault is running behind a reverse proxy
exports.is_proxy = false;

// Database settings
exports.mysql = {
  host: 'localhost',
  port: '3306',
  database: 'blob_vault',
  user: 'blobby',
  password: '57umtSMG4Fyv5ary'
};

