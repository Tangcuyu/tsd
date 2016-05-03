
var net = require('net');

var x = 0;

var client = net.connect({ port: 9099, host: '101.200.209.103' }, function() {

  function write(json) {
    client.write(JSON.stringify(json) + '\n');
  }
  
  setInterval(function() {

    x++;

    write({ key: '噪音', value: (Math.random() + x) / 20 });
    write({ key: '温度', value: (Math.random() + x) / 50 });
    write({ key: 'X轴振动偏移',   value: (Math.random() + x) / 50 });

  }, 1000);

});

client.setEncoding('utf8');
client.on('data', (chunk) => {
            //assert.equal(typeof chunk, 'string');
          //console.log('got data %d', chunk.toString());
            console.log('got %d characters of string data', chunk.length);
            });