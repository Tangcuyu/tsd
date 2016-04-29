
var net = require('net');

var x = 0;

var client = net.connect({ port: 9099 }, function() {

  function write(json) {
    client.write(JSON.stringify(json) + '\n');
  }
  
  setInterval(function() {

    x++;

    write({ key: 'X轴振动偏移',   value: (Math.random() + x) / 50 });
    write({ key: 'Y轴振动振幅', value: (Math.random() + x) / 30 });
    write({ key: '噪音', value: (Math.random() + x) / 20 });
    write({ key: '温度', value: (Math.random() + x) / 10 });

  }, 150);

});
