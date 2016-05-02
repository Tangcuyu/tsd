var stshttp = require('./lib');
var net = require('net');

stshttp({
  http: 8080,
  tcp: 9099
});
