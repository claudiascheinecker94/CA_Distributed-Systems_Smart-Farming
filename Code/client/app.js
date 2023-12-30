var readline = require('readline')
var readlineSync = require('readline-sync')
var grpc = require("@grpc/grpc-js")
var protoLoader = require("@grpc/proto-loader")
var PROTO_PATH = __dirname + "/protos/cattle.proto"

var packageDefinition = protoLoader.loadSync(PROTO_PATH)
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle
var client = new cattle_proto.ShedMonitoring("0.0.0.0:40000", grpc.credentials.createInsecure());
var news = new cattle_proto.NewsAlerts("0.0.0.0:40000",  grpc.credentials.createInsecure());
var location = new cattle_proto.GrazingMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());


//---bidirectional streaming---
var name = readlineSync.question("Who is leaving the shed? ")
var call = location.grazingLocation();

//Send initial message
call.write({
  message: name + " started grazing",
  name:name,
  location:0,
});

//Set up interval to send location updates
var locationUpdate = setInterval(() => {
var location = Math.random() *10;

  call.write({
    message: name + " is safely grazing",
    name: name,
    location: location,
  });
  if(location >=7 && location <=8){
    call.write({
      message: name + " entered dangerous territory (mitigation efforts in place)",
      location:location,
      name: name,
    })
  }
  if(location >= 9){
    call.write({
        message: name + " finished grazing",
        location:location,
        name: name,
    });
    call.end();
    clearInterval(locationUpdate);
  }
}, 2000); //adjusting intervals

call.on('data', function(resp) {
    console.log(resp.message + " at location " + resp.location)
});

call.on('end', function(){
  clearInterval(locationUpdate);
});

call.on("error", function(e){
    console.log("Cannot connect to server")
});
