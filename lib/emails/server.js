/// A little server to test email designs
var emails = require('./');
var files = Object.keys(emails);
require('http').createServer(function(req, res) {
  var url  = req.url;
  var type = url.indexOf(".txt") === -1 ? "html" : "plain";
  res.writeHead(200, {"Content-Type": "text/" + type});

  if (url === "/") {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(
      '<html><body>'
    +   files.map(function(file) {
          return '<a href="/' + file + '">' + file + '</a>'
        }).join('<br>')
    + '</body></html>');
  } else {
    res.end(emails[url.slice(1)]);
  }
}).listen(4015, "127.0.0.1");
console.log("listening on http://127.0.0.1:4015");
