var grpc = require("@grpc/grpc-js")
var protoLoader = require("@grpc/proto-loader")
var PROTO_PATH = __dirname + "/protos/cattle.proto"
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH
)
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle

//Cattle Monitoring Service
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
function shedAirConditions(call, callback){

  var temperature = 0;
  var humidity = 0; 
  var ammonia = 0;
  var alertMessage = "";

  var tempIncrease = 0;
  var tempDecrease = 0;
  var activateDehumidifier = 0;
  var deactivateDehumidifier = 0;
  var adjustFood = 0;
  var dataCount = 0;

  call.on('data', function(request){

    dataCount++;
    temperature += request.temperature;
    humidity += request.humidity;
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
      avgAmmoniaLv:(ammonia/dataCount)
    })
  })

  call.on('error', function(e){
    console.log(e)
  })
}

function shedWaterConditions(call, callback){
  var waterQuality = 0;
  var waterQuantity= 0;
  var alertMessage = "";
  
  var phAdjusted = 0;
  var addWater = 0;
  var dataCount = 0;

  call.on('data', function(request){

    dataCount++;
    waterQuality += request.waterQuality;
    waterQuantity += request.waterQuantity;

    if(request.waterQuality > 9 || request.waterQuality < 5){
      phAdjusted++;
      if(phAdjusted > 2) {
        alertMessage += "pH level adjusted, ";
        phAdjusted = 0;
      }
    }

    if(request.waterQuantity < 100){
      addWater++;
      if(addWater > 2) {
        alertMessage += "water refilled, ";
        addWater = 0;
      }
    }
  })

  call.on("end", function(){
    callback(null, {
      alertMessage:alertMessage,
      avgWaterQuality:(waterQuality/dataCount),
      avgWaterQuantity:(waterQuantity/dataCount),
    })
  })

  call.on('error', function(e){
    console.log(e)
  })
}

//News And Statistics Service
//unary grpc
function futureTopics(call, callback){

  try{
    var topic = call.request.topic;
    var topics = [];
    topics.push(topic);

    if(topic){
        var message = "Thanks! We will send you updates about " + topic + " moving forward."

        callback(null, {
            message:message,
        })
    } else {
        callback(null, {
            message: "Please define a topic."
        })
    }
  } catch (e) {
      callback(null, {
          message: "An error occurred"
      })
  }  
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

var monthlyData = [];

function getHistoricData(call, callback){
  for(var i = 0; i < 12; i++){
    let dataSet = {
      temp:Math.floor(Math.random() * (45 - 10) + 10), 
      hum:Math.floor(Math.random() * (80 - 40) + 40),
      wQual:Math.floor(Math.random() * 15),
      wQuan:Math.floor(Math.random() * 400),
      amm:Math.floor(Math.random() * 100),
      grazing: Math.floor(Math.random() * 365),
    };
    monthlyData.push(dataSet)
    call.write({
      annualTemp: monthlyData[i].temp,
      annualHum: monthlyData[i].hum,
      wQuality: monthlyData[i].wQual,
      wQuantity: monthlyData[i].wQuan,
      annualAmm: monthlyData[i].amm,
      daysGrazing: monthlyData[i].grazing
    });
  }
call.end()
}

module.exports = {
  getNewsAlerts: getNewsAlerts,
  getHistoricData: getHistoricData
};

function grazingTrends(call, callback){
  var time = [];
  var grazingLocation = [];
  var avoidLocations;
  var safeLocations;

  call.on('data', function(request){
    time.push(request.time);
    grazingLocation.push(request.grazingLocation);
  }) 

  call.on("end", function(){
    var sum = 0;
    const counts = {};

    time.forEach(sumTime);
    function sumTime(item){
      sum+= item;
    }

    grazingLocation.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });

    //console.log(sum);
    //console.log(grazingLocation);
    //console.log(counts);

    var maps = Object.values(counts);
    console.log(maps);
    var index = Object.keys(counts);
    console.log(index);

    avoidLocations = "To be avoided: ";
    safeLocations = "Safe to graze: ";
    for(var i=0; i<index.length;i++){
        if (sum/maps[i] > 24){
          avoidLocations += " " + index[i];
        } else {
          safeLocations += " " + index[i];
        }
      }

    //console.log("app.js avoidLocations: " + avoidLocations);
    //console.log("app.js safeLocations: " + safeLocations);

    callback(null, {
      avoidLocations:avoidLocations,
      safeLocations:safeLocations,
    })
  })

  call.on('error', function(e){
    console.log(e)
  })
}

module.exports = grazingTrends;

var blocklist = [];
function grazingBlocklist(call, callback){

  try{
    var tagId = parseInt(call.request.tagId)
    console.log(tagId);
    if(!isNaN(tagId)){
        blocklist.push({
          tagId: tagId,
          loggedDate: "" + new Date().toJSON(),
          timeoutLength: Math.floor(Math.random() * 30)
        });

        console.log(blocklist);
        console.log(blocklist[0].tagId);
        console.log(blocklist[0].loggedDate);
        console.log(blocklist[0].timeoutLength);

        callback(null, {
          tagId:blocklist[blocklist.length-1].tagId,
          loggedDate:blocklist[blocklist.length-1].loggedDate,
          timeoutLength:blocklist[blocklist.length-1].timeoutLength
        })
    } 
  } catch (e) {
      console.log(e);
  }  
}

//bidirectional streaming
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
server.addService(cattle_proto.CattleMonitoring.service, {cattleData:cattleData, shedAirConditions:shedAirConditions, shedWaterConditions:shedWaterConditions});
server.addService(cattle_proto.GrazingMonitoring.service, {grazingTrends:grazingTrends,grazingBlocklist:grazingBlocklist,grazingLocation:grazingLocation});
server.addService(cattle_proto.NewsAndStatistics.service, {getNewsAlerts:getNewsAlerts, getHistoricData:getHistoricData, futureTopics:futureTopics});
server.bindAsync("0.0.0.0:40000", grpc.ServerCredentials.createInsecure(), function() {
  server.start()
})

