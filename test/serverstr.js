
var net = require('net');

var x = 0;

var max = 2;



var client = net.connect({ port: 9099, host: '101.200.209.103' }, function() {
  
  var id = setInterval(function() {

    x++;

    var val = ((Math.random() * 100) / 20).toString();

    client.write('100211,tnpt213,'+ val + ',6,lx 9600,lxzj,,,,,db,;');

    if(x > max) {
      clearInterval(id);
      client.end();
      console.log('Data transfer done.');}

  }, 1000);

    

});



client.setEncoding('utf8');
client.on('data', (chunk) => {
            //assert.equal(typeof chunk, 'string');
          //console.log('got data %d', chunk.toString());
            console.log('got data:', chunk.toString());
            });