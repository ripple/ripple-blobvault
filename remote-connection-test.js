var RL = require('ripple-lib');
var ripplelib = {
  trusted:        true,
  servers: [
    {
//        host:    '54.86.37.48'
        host: 's1.ripple.com'
      , port:    443
      , secure:  false
    }
  ]
}
var remote = new RL.Remote(ripplelib);
var remote_reconnector = require('./lib/remote-reconnector')(remote);
