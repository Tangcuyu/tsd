
var net = require('net');

var x = 0;





var client = net.connect({ port: 9099, host: '101.200.209.103' }, function() {
  
  setInterval(function() {


    var val = ((Math.random() * 100) / 20).toString();

    client.write('100211,tnpt213,'+ val + ',6,lx 9600,lxzj,,,,,db,;');

  }, 1000);

  setTimeout(function(){
    client.end();
  },5000);

});



client.setEncoding('utf8');
client.on('data', (chunk) => {
            //assert.equal(typeof chunk, 'string');
          //console.log('got data %d', chunk.toString());
            console.log('got data:', chunk.toString());
            });