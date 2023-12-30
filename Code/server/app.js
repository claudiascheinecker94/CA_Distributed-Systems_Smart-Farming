var grpc = require("@grpc/grpc-js")
var protoLoader = require("@grpc/proto-loader")
var PROTO_PATH = __dirname + "/protos/cattle.proto"
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH
)
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle

/***Cattle Monitoring Service***
* consists of:
* a unary function (cattleData) that passes a tagId to the server and returns the related cattle health data from the database.
* a client-side stream (shedAirConditions) that takes air measurements within the shed 5 times a day. On the server-side it will then be determined based on a set of parameters if any actions are necessary to improve the air conditions, the measurements and actions are then passed back to the client.
* a client-side steam (shedWaterConditions that takes water measurements within the shed 5 times a day. On the server-side it will then be determined based on a set of parameters if any actions are necessary to improve the wateer conditions, the measurements and actions are then passed back to the client.*/

//unary grpc
function cattleData(call, callback){

  //error validation
  try{
    //tagId is passed from the client to server and checked to be a number
    var tagId = parseInt(call.request.tagId)
    if(!isNaN(tagId)){
        //cattle data is randomly generated as no physical sensors are in place
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

        //health status is passed back to the client via callback function
        callback(null, {
          tagId:tagId,
          age:age,
          weight:weight,
          healthStatus:healthStatus,
          heatDetection:heatDetection,
        })
    } 
  } catch (error) {
      callback(null, {
          error:error,
      })
  }  
}

//client-side streaming
function shedAirConditions(call, callback){

  //variables for computation
  var temperature = 0;
  var humidity = 0; 
  var ammonia = 0;
  var airAlertMessage = "";

  var tempIncrease = 0;
  var tempDecrease = 0;
  var activateDehumidifier = 0;
  var deactivateDehumidifier = 0;
  var adjustFood = 0;
  var dataCount = 0;

  call.on('data', function(request){
    //counter - counting the loops to get the daily average
    dataCount++;

    //summing up the data stream coming from the client
    temperature += request.temperature;
    humidity += request.humidity;
    ammonia += request.ammonia;

    /*methods to determine if automatic actions need to take place
    * For example, if the shed temperature is below 20 Celsius, we will increment tempIncrease. 
    * If tempIncrease was incremented more then twice throughout he daily measurements, we will automatically increase shed temperature.
    * The remaining if-functions follow a similar logic.
    */
    if(request.temperature < 20){
      tempIncrease++;
      if(tempIncrease > 2) {
        airAlertMessage += "temperature increased, ";
        tempIncrease = 0;
      }
    } 

    if(request.temperature > 27){
      tempDecrease++;
      if(tempDecrease > 2) {
        airAlertMessage += "temperature decreased, ";
        tempDecrease = 0;
      }
    }
    
    if(request.humidity > 70){
      activateDehumidifier++;
      if(activateDehumidifier > 2) {
        airAlertMessage += "dehumidifier activated, ";
        activateDehumidifier = 0;
      }
    }

    if(request.humidity < 50){
      deactivateDehumidifier++;
      if(deactivateDehumidifier > 2) {
        airAlertMessage += "dehumidifier deactivated, ";
        deactivateDehumidifier = 0;
      }
    }

    if(request.ammonia > 40){
      adjustFood++;
      if(adjustFood > 2) {
        airAlertMessage += "food adjusted to combat ammonia, ";
        adjustFood = 0;
      }
    }
  })

  //once the stream ends, we pass through the alertMessage with all actions that were taken, and the average daily measurements via the callback function.
  call.on("end", function(){
    callback(null, {
      airAlertMessage:airAlertMessage,
      avgTemperature:(temperature/dataCount),
      avgHumidity:(humidity/dataCount),
      avgAmmoniaLv:(ammonia/dataCount)
    })
  })

  //error logging
  call.on('error', function(e){
    console.log(e)
  })
}

//client-side streaming
function shedWaterConditions(call, callback){

  //variables for computation
  var waterQuality = 0;
  var waterQuantity= 0;
  var waterAlertMessage = "";
  
  var phAdjusted = 0;
  var addWater = 0;
  var dataCount = 0;

  call.on('data', function(request){

    //counter - counting the loops to get the daily average
    dataCount++;

    //summing up the data stream coming from the client
    waterQuality += request.waterQuality;
    waterQuantity += request.waterQuantity;

    /*methods to determine if automatic actions need to take place
    * For example, if the measured water has a pH level outside of 5 and 9 we increment phAdjusted. 
    * If phAdjusted was incremented more then twice throughout he daily measurements, we will automatically adjust the pH level and send a message back to the client.
    * The remaining if-functions follow a similar logic.
    */

    if(request.waterQuality > 9 || request.waterQuality < 5){
      phAdjusted++;
      if(phAdjusted > 2) {
        waterAlertMessage += "pH level adjusted, ";
        phAdjusted = 0;
      }
    }

    if(request.waterQuantity < 100){
      addWater++;
      if(addWater > 2) {
        waterAlertMessage += "water refilled, ";
        addWater = 0;
      }
    }
  })

  //once the stream ends, we pass through the alertMessage with all actions that were taken, and the average daily measurements via the callback function.
  call.on("end", function(){
    callback(null, {
      waterAlertMessage:waterAlertMessage,
      avgWaterQuality:(waterQuality/dataCount),
      avgWaterQuantity:(waterQuantity/dataCount),
    })
  })

  //error logging
  call.on('error', function(e){
    console.log(e)
  })
}

/***News & Statistics Service***
* consists of:
* a unary function (futureTopics) that passes a user input (topic) to the server to be saved for future news alerts. A confirmation message is passed back to the client. 
* a server-side stream (getNewsAlert) which streams an array of news articles from the server to the client.
* a server-side stream (getHistoricData) which streams sensor data saved on the server from the past year to the client upon request*/

//unary grpc
function productionExemption(call, callback){

  //error validation
  try{
    //receiving the topic variable from the client
    var topic = call.request.topic;

    //saving the passed in variable within an array
    var outputExclude = [];
    outputExclude.push(outputExclude);

    //if the variable topic exists, a confirmation message is sent back to the client.
    if(!isNaN(outputExclude) && outputExclude > 0){
        var message = "Thanks! We will exclude ID " + topic + " from the milk cycle today."

        callback(null, {
            message:message,
        })
    } else {
        //if not, the user is prompted to define a topic.
        callback(null, {
            message: "Please add a Tag-ID"
        })
    }
  } catch (e) {
      callback(null, {
          message: "An error occurred"
      })
  }  
}

//server-side streaming
var news = [
  {category: "Weather", url: "Check Recent Storm Alerts"},
  {category: "System & Maintenance",url: "Check Smart Farming Updates"},
  {category: "Current News",url: "Check Latest News Articles"},
  {category: "Privacy & Legal",url: "Check Latest Cattle Regulation Changes"},
  {category: "Statistics",url: "Check 2023 CSO Statistics"}]

//traversing through an array of news articles and URLs to pass back to the client
function getNewsAlerts(call, callback) {
    for(var i = 0; i < news.length; i++){
        call.write({
          category: news[i].category,
          url: news[i].url,
        });
      }
  call.end()
}

//server-side streaming
var monthlyData = [];

//generating random datasets and pushing them into an array
//!!!!!!possibly add interval here????!!!!!!
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
    //after every loop the dataSet is streamed to the client
    call.write({
      annualTemp: monthlyData[i].temp,
      annualHum: monthlyData[i].hum,
      wQuality: monthlyData[i].wQual,
      wQuantity: monthlyData[i].wQuan,
      annualAmm: monthlyData[i].amm,
      daysGrazing: monthlyData[i].grazing
    });
  }
  //calling end once the loop is finished and all data was streamed to the client.
call.end()
}

module.exports = {
  getNewsAlerts: getNewsAlerts,
  getHistoricData: getHistoricData
};

/***Grazing Monitoring Service***
* consists of:
* a client-side stream (grazingTrends) that receives location data of the past 30 days from the client and then assesses which locations are safe to use for grazing in the next 30 days and which ones are to be avoided based on the time spent out grazing (as there might be limited ressources left at that location). It then passes the avoidLocations and safeLocations back to the client. 
* a unary grpc function (grazingBlocklist) that manually adds cattles to a grazing blocklist based on tagID and saves the relevant metadata onto the server and return them to the client. 
* a bidirectional stream (grazingLocation) that detects the tagID once the herd leaves the shed for grazing and sends the cattle location to the server in real-time intervals, the server will analyse the safety of the location based on geofencing data and returns real-time alerts based on the client-side stream.
** Once the tagId is detected at a specific location, the stream ends as the herd is back in the shed. 
*/

//client-side stream
//!! ---I think I need to change this to server-side streaming---!! Maybe??
function grazingTrends(call, callback){
  var time = [];
  var grazingLocation = [];
  var avoidLocations;
  var safeLocations;

  call.on('data', function(request){

    //stream of data from the client is pushed into an array within the server.
    time.push(request.time);
    grazingLocation.push(request.grazingLocation);
  }) 
  
  //once the stream ends the safe and unsafe grazing locations are calculated.
  call.on("end", function(){
    var sum = 0;
    const counts = {};

    //the daily time spend out grazing is added up
    time.forEach(sumTime);
    function sumTime(item){
      sum+= item;
    }

    //the duplicated elements within the grazingLocation array are counted and passed into the counts{} object, so we can determine which locations have been visited more than once. 
    grazingLocation.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });

    //console.log(sum);
    //console.log(grazingLocation);
    //console.log(counts);

    //the values (number of duplicates) from the counts{} object are safed in a separate maps variable.
    var maps = Object.values(counts);
    console.log(maps);

     //the keys (locations) from the counts{} object are safed in a separate index variable.
    var index = Object.keys(counts);
    console.log(index);

    avoidLocations = "";
    safeLocations = "";
    //calculating if the amount of time spent per location is more than 24 hours (assuming and equal distribution of time per location)
    //if one are has been grazed on for more than 24 hours in the past month, it is added as an "avoidLocation"
    for(var i=0; i<index.length;i++){
        if (sum/maps[i] > 24){
          avoidLocations += " " + index[i];
        } else {
          safeLocations += " " + index[i];
        }
      }

    //console.log("app.js avoidLocations: " + avoidLocations);
    //console.log("app.js safeLocations: " + safeLocations);
    
    //we pass the safe and unsafe locations back to the client
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

//unary grpc
var blocklist = [];
function grazingBlocklist(call, callback){

  //error validation
  try{
    //passing the tagId from the client to the server
    var tagId = parseInt(call.request.tagId)
    console.log(tagId);
    //if the tag is a number, it will be added to an array along with today's date and the number of days the animal cannot graze.
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

        //we pass back the last entry to the array to the client
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



var cattles = {}
function grazingLocation(call, callback) {
  call.on('data', function(locationMsg){

    //if the cattle name cannot be found in the cattles array, then pass in the name.
    if(!(locationMsg.name in cattles)){
        cattles[locationMsg.name] = {
        name: locationMsg.name,
        call: call,
      }
    }

    //for all cattles within the cattle array pass on the location, message and name to the client
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
//adding the grpc services to the server
server.addService(cattle_proto.CattleMonitoring.service, {cattleData:cattleData, shedAirConditions:shedAirConditions, shedWaterConditions:shedWaterConditions});
server.addService(cattle_proto.GrazingMonitoring.service, {grazingTrends:grazingTrends,grazingBlocklist:grazingBlocklist,grazingLocation:grazingLocation});
server.addService(cattle_proto.NewsAndStatistics.service, {getNewsAlerts:getNewsAlerts, getHistoricData:getHistoricData, productionExemption:productionExemption});

server.bindAsync("0.0.0.0:40000", grpc.ServerCredentials.createInsecure(), function() {
  server.start()
})

