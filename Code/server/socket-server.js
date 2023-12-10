
//adding websocker boilerplate code for bidirectional streaming
var { createServer } = require("http");
var { Server } = require("socket.io");


var httpServer = createServer((req, res) => {

});


var io = new Server (httpServer, {
    cors: {
        origin: "*",
        methods: "*",
    }
});

io.on("connection", function(socket){
    console.log(`connect ${socket.id}`);

    socket.on('location-update', function(locationMsg){
      io.emit('location-update', locationMsg);
  });

    socket.on("disconnect", function(reason){
        console.log(`disconnect ${socket.id} due to ${reason}`);
    });
});

httpServer.listen(3001);