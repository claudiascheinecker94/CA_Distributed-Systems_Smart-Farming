var grpc = require("@grpc/grpc-js")
var protoLoader = require("@grpc/proto-loader")
var PROTO_PATH = __dirname + "/protos/cattle.proto"
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH
)
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle


//client-side streaming
//once data from client is passed in, alert message is adjusted accordingly and returned to web browser
function shedData(call, callback){

  var tempIncrease = 0;
  var tempDecrease = 0;
  var activateDehumidifier = 0;
  var deactivateDehumidifier = 0;
  var addWater = 0;
  var adjustFood = 0;
  var alertMessage = "";

  call.on('data', function(request){

    if(request.temperature < 20){
      tempIncrease++;
      if(tempIncrease > 3) {
        alertMessage += "temperature increased, ";
      }
    } 

    if(request.temperature > 27){
      tempDecrease++;
      if(tempDecrease > 2) {
        alertMessage += "temperature decreased, ";
      }
    }
    
    if(request.humidity > 70){
      activateDehumidifier++;
      if(activateDehumidifier > 2) {
        alertMessage += "dehumidifier activated, ";
      }
    }

    if(request.humidity < 40){
      deactivateDehumidifier++;
      if(deactivateDehumidifier > 3) {
        alertMessage += "dehumidifier deactivated, ";
      }
    }

    if(request.waterQuality = 1 || request.waterQuantity < 4){
      addWater++;
      if(addWater > 6) {
        alertMessage += "water checked, ";
      }
    }

    if(request.ammonia > 40){
      adjustFood++;
      if(adjustFood > 2) {
        alertMessage += "food adjusted to combat ammonia, ";
      }
    }
  })

  call.on("end", function(){
    callback(null, {
      alertMessage:alertMessage
    })
  })

  call.on('error', function(e){
    console.log(e)
  })
}

//server-side streaming
var news = [{category: "Weather", url: "Check Recent Storm Alerts"},{category: "System & Maintenance",url: "Check Smart Farming Updates"},{category: "Current News",url: "Check Latest News Articles"},{category: "Privacy & Legal",url: "Check Latest Cattle Regulation Changes"},{category: "Statistics",url: "Check 2023 CSO Statistics"}]

function getNewsAlerts(call, callback) {
  //var newsUpdate = setInterval(() => {
    for(var i = 0; i < news.length; i++){
        call.write({
          category: news[i].category,
          url: news[i].url,
        });
      }
    //}, 2000);

  call.end()
  //clearInterval(newsUpdate);
}




//bidirectional streaming*/
var cattles = {
}

function grazingLocation(call, callback) {
  call.on('data', function(locationMsg){

    if(!(locationMsg.name in cattles)){
        cattles[locationMsg.name] = {
        name: locationMsg.name,
        call: call,
      }
    }

    for (var cattle in cattles) {
        cattles[cattle].call.write({
        location: locationMsg.location,
        message: locationMsg.message,
        name: locationMsg.name,
      })
    }
  });

  call.on('end', function() {
    call.end();
  });

  call.on('error', function(e){
    console.log(e);
  })
}

var server = new grpc.Server()
server.addService(cattle_proto.ShedMonitoring.service, {shedData:shedData});
server.addService(cattle_proto.GrazingMonitoring.service, {grazingLocation:grazingLocation});
server.addService(cattle_proto.NewsAlerts.service, {getNewsAlerts:getNewsAlerts});
server.bindAsync("0.0.0.0:40000", grpc.ServerCredentials.createInsecure(), function() {
  server.start()
})
