var http = require('http');
var net = require('net');
var url = require('url');
var fs = require('fs');
var createCache = require('levelup');
var LevelWriteStream = require('level-write-stream');
var path = require('path');

var es = require('event-stream');

var st = require('st');
var WebSocketServer = require('ws').Server;
var WebSocket = require('./websocket');

var staticHandler = st({
  path: path.join(__dirname, '..', 'public'),
  url: '/',
  index: 'index.html'
});

// list of currently connected clients (users)
  var WsClients = [];

module.exports = function(ports) {

  ports = ports || {};

  ports.http = ports.http || 80;
  ports.tcp = ports.tcp || 9099;

  // create levelDB:cache in the lib folder
  var location = path.join(__dirname, 'cache');
  
  // create log folder
  var logFileName = path.join(__dirname, 'tcplog');

  createCache(location, { keyEncoding: 'string', valueEncoding: 'json' }, function(error, cache) {
	
	// Create a writeable stream for levelDB: cache
    var WriteStream = LevelWriteStream(cache);

    /* 
      Create a tcpserver instance.
    */
    var tcpserver = net.createServer(function(socket) {
        if (socket) {
        //socket.end('goodbye\n');
      }
    });

	//Allow the max 64 clients to get connected to us.
	tcpserver.maxConnections = 64;
	
    tcpserver.listen(ports.tcp, function() {
      console.log('tcp server listening on %d', ports.tcp);
    });


    /*
      One issue some users run into is getting EADDRINUSE errors. 
      This means that another server is already running on the requested port. 
      One way of handling this would be to wait a second and then try again. 
    */
    tcpserver.on('error', function (e) {
      if (e.code == 'EADDRINUSE') {
        console.log('Port in use, retrying...');
          
        setTimeout(function () {
          tcpserver.close();
          console.log('Try listening on alternative port: ' + ports.tcp);
          tcpserver.listen(ports.tcp, function() {
            console.log('tcp server listening on %d', ports.tcp);
          });
        }, 1000);
      }
    });  

    // Handle a "new connection" event
    tcpserver.on('connection', function (socket) {    
      // Identify this client   
      socket.name = socket.remoteAddress+':'+socket.remotePort;
      // Add the new client in the list
      WsClients.push(socket);
      
      // We have a connection - a socket object is assigned to the connection automatically   
      console.log('\nCONNECTED with tcp client: ' + socket.name +'\n' + 'CONNECTED time: ' + (new Date()) +'\n' );
        
      // Add a 'data' event handler to this instance of socket
	  socket.on('data', function(data) {
				var message = (new Date()) + socket.name + '> ' + data.toString();
				var data_str = data.toString();
							
				// Write the data back to the socket, the client will receive it as data from the server
				socket.write('Server received:\n'+data_str+'\n'+'from:'+socket.name+'\n');
				// Log it to the server output!
				//process.stdout.write(message);
				
				//Write the log to logfile.
				fs.appendFile(logFileName, message + '\n', function (err) {
					if (err) {
						console.log('Append file: ' + logFileName + ' error...\n');
					}
				});	
				// Pulls all data out of the readable stream: socket, and write it to the destination: WriteStream
	
				if (!data_str.indexOf('key')) {
           socket
						.pipe(es.split(";"))  // split the incoming data with ";"
						// get the sensor type and sensor value for each incoming data line. return a object of string
						.pipe(es.map(function(line,cb){
							   var obj= new Object();
							   var strarray = line.split(",")
								   obj.key=strarray[1];
								   obj.value=strarray[2];
							cb(null,obj);
						})) 
						.pipe(WriteStream());	
        } else {
            socket
              .pipe(es.split(';'))
              .pipe(es.parse())
              .pipe(WriteStream());
        }
	  });

      // Add a 'error' event handler to this instance of socket 
      socket.on('error', function (e) {   
        console.error('socket error with return code: ' + e.code);
        //We should end mysql pool due to the database operation error instead.
        //TODO: Need to find a good point to call endConnections() somewhere else.
        //The other side of the TCP conversation abruptly closed its end of the connection
           console.log('Client:' + socket.name + ' stop the tcpconnection abnormally.');
		   socket.destroy();
      }); 	

      socket.on('end', function () {
        // body...
        socket.write('goodbye');
		//cache.close();//close the underlying levelDB store.
      });

      // Add a 'close' event handler to this instance of socket
      socket.on('close', function () {
        //remove the end connection with the client: socket.name
        WsClients.splice(WsClients.indexOf(socket), 1);       
        console.log('TCPConnection CLOSED by: ' + socket.name); 
        cache.close();//close the underlying levelDB store.
        // recreate a tcpserver    
          tcpserver.listen(ports.tcp, function() {
            console.log('TCP server listening on %d again', ports.tcp);
          });   
      });
      
    });

    var httpserver = http.createServer(staticHandler);
    var wss = new WebSocketServer({ 
      server: httpserver.listen(ports.http, function() {
        console.log('http server listening on %d', ports.http);
      }) 
    });

      wss.on('connection', function(ws) {

        var websocket = new WebSocket(ws);

        cache.createKeyStream()
          .on('data', function(key) {
            cache.get(key, function (err, value) {
              if (!err) send(key, value);
            });
          })
          .on('end', function() {
            cache.on('put', send);
          })

        function send(key, value) {
          var response = JSON.stringify({ key : key, value : value });
          websocket.write(response);
        }

        /* websocket.on('error', function (e) {
        // body...
        console.log('ws error' + e);
        ws.close(); 
      });*/

        websocket.on('close',function(){
          console.log('clinet disconnet the websocket-connection');
        });

      });

    
      wss.on('error', function (e) {
        // body...
        console.log('wss error' + e);
      });

  });
};
