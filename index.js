var stshttp = require('./lib');
var net = require('net');

stshttp({
  http: 80,
  tcp: 9099
});
