var http = require('http');
var net = require('net');
var url = require('url');
var fs = require('fs');
var createCache = require('levelup');
var LevelWriteStream = require('level-write-stream');
var path = require('path');

var es = require('event-stream');

var st = require('st')
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

  var location = path.join(__dirname, 'cache');

  createCache(location, { keyEncoding: 'string', valueEncoding: 'json' }, function(error, cache) {
	
    var WriteStream = LevelWriteStream(cache);
    /* 
      Create a tcpserver instance.
    */
    var tcpserver = net.createServer(function(socket) {
        if (socket) {
        //socket.end('goodbye\n');
      }
    });

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
      // Add thie new client in the list
      WsClients.push(socket);
      
      // We have a connection - a socket object is assigned to the connection automatically   
      console.log((new Date()) +'\nCONNECTED with: ' + socket.name +'\n');
        
      // Add a 'data' event handler to this instance of socket
      socket
            .pipe(es.split())
            .pipe(es.parse())
            .pipe(WriteStream());

      

      // Add a 'error' event handler to this instance of socket 
      socket.on('error', function (e) {   
        //console.error('socket error with return code: ' + e.code);
        //We should end mysql pool due to the database operation error instead.
        //TODO: Need to find a good point to call endConnections() somewhere else.
        //The other side of the TCP conversation abruptly closed its end of the connection
        if(e.code = 'ECONNRESET')  
        {
          // recreate a tcpserver    
          tcpserver.listen(ports.tcp, function() {
            console.log('tcp server listening on %d again', ports.tcp);
          });    
        }
      }); 

      // Add a 'close' event handler to this instance of socket
      socket.on('close', function () {
        //remove the end connection with the client: socket.name
        WsClients.splice(WsClients.indexOf(socket), 1);       
        console.log('Connection CLOSED: ' + socket.name); 
        /*NOTICE: do not call this since socket close occurs before sql operation. */
        //End database pool connections 
        //cm_db.endConnections();
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
        console.log('websocket disconnet with'+e.message);

      });*/

    });
  });
};
