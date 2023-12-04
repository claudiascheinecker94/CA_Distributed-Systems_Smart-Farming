var grpc = require("@grpc/grpc-js")
var protoLoader = require("@grpc/proto-loader")
var PROTO_PATH = __dirname + "/protos/cattle.proto"
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH
)
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle

//unary grpc

function cattleData(call, callback){

  try{
    var tagId = parseInt(call.request.tagId)
    if(!isNaN(tagId)){
        var age = Math.floor(Math.random() * 10 + 1);
        var weight = Math.floor(Math.random() * (1500 - 700) + 700);
        var healthStatus;
        var healthStatusGenerator = Math.floor(Math.random() * 2);
        var heatDetection;
        var heatDetectionGenerator = Math.floor(Math.random() * 2);

        if (healthStatusGenerator === 0){
          healthStatus = "no data yet";
        } else if (healthStatusGenerator === 1) {
          healthStatus = "good health";
        } else {
          healthStatus = "health issues - please consult vet"
        }

        if (heatDetectionGenerator === 0){
          heatDetection = "not in heat";
        } else if (heatDetectionGenerator === 1) {
          heatDetection = "in heat";
        } else {
          heatDetection = "pregnant";
        }

        callback(null, {
          tagId:tagId,
          age:age,
          weight:weight,
          healthStatus:healthStatus,
          heatDetection:heatDetection,
        })
    } else {
        callback(null, {
            message: "TagID incorrect, please try again"
        })
    }
  } catch (e) {
      callback(null, {
          message: "An error occurred"
      })
  }  
}

//client-side streaming
function shedData(call, callback){

  var temperature = 0;
  var humidity = 0;
  var waterQuality = 0;
  var waterQuantity = 0;
  var ammonia = 0;

  var tempIncrease = 0;
  var tempDecrease = 0;
  var activateDehumidifier = 0;
  var deactivateDehumidifier = 0;
  var phAdjusted = 0;
  var addWater = 0;
  var adjustFood = 0;
  var alertMessage = "";
  var dataCount = 0;

  call.on('data', function(request){

    dataCount++;
    temperature += request.temperature;
    humidity += request.humidity;
    waterQuality += request.waterQuality;
    waterQuantity += request.waterQuantity;
    ammonia += request.ammonia;


    if(request.temperature < 20){
      tempIncrease++;
      if(tempIncrease > 2) {
        alertMessage += "temperature increased, ";
        tempIncrease = 0;
      }
    } 

    if(request.temperature > 27){
      tempDecrease++;
      if(tempDecrease > 2) {
        alertMessage += "temperature decreased, ";
        tempDecrease = 0;
      }
    }
    
    if(request.humidity > 70){
      activateDehumidifier++;
      if(activateDehumidifier > 2) {
        alertMessage += "dehumidifier activated, ";
        activateDehumidifier = 0;
      }
    }

    if(request.humidity < 50){
      deactivateDehumidifier++;
      if(deactivateDehumidifier > 2) {
        alertMessage += "dehumidifier deactivated, ";
        deactivateDehumidifier = 0;
      }
    }

    if(request.waterQuality > 9 || request.waterQuality < 5){
      phAdjusted++;
      if(phAdjusted > 4) {
        alertMessage += "pH level adjusted, ";
        phAdjusted = 0;
      }
    }

    if(request.waterQuantity < 100){
      addWater++;
      if(addWater > 4) {
        alertMessage += "water refilled, ";
        addWater = 0;
      }
    }

    if(request.ammonia > 40){
      adjustFood++;
      if(adjustFood > 2) {
        alertMessage += "food adjusted to combat ammonia, ";
        adjustFood = 0;
      }
    }
  })

  call.on("end", function(){
    callback(null, {
      alertMessage:alertMessage,
      avgTemperature:(temperature/dataCount),
      avgHumidity:(humidity/dataCount),
      avgWaterQuality:(waterQuality/dataCount),
      avgWaterQuantity:(waterQuantity/dataCount),
      avgAmmoniaLv:(ammonia/dataCount)
    })
  })

  call.on('error', function(e){
    console.log(e)
  })
}

//server-side streaming
var news = [{category: "Weather", url: "Check Recent Storm Alerts"},{category: "System & Maintenance",url: "Check Smart Farming Updates"},{category: "Current News",url: "Check Latest News Articles"},{category: "Privacy & Legal",url: "Check Latest Cattle Regulation Changes"},{category: "Statistics",url: "Check 2023 CSO Statistics"}]

function getNewsAlerts(call, callback) {
    for(var i = 0; i < news.length; i++){
        call.write({
          category: news[i].category,
          url: news[i].url,
        });
      }
  call.end()
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
server.addService(cattle_proto.CattleMonitoring.service, {shedData:shedData, cattleData:cattleData});
server.addService(cattle_proto.GrazingMonitoring.service, {grazingLocation:grazingLocation});
server.addService(cattle_proto.NewsAlerts.service, {getNewsAlerts:getNewsAlerts});
server.bindAsync("0.0.0.0:40000", grpc.ServerCredentials.createInsecure(), function() {
  server.start()
})

