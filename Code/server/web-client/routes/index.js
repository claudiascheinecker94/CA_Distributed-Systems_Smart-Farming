var express = require('express');
var router = express.Router();
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var socketIO = require('socket.io');

var PROTO_PATH = __dirname + "/../protos/cattle.proto";
var packageDefinition = protoLoader.loadSync(PROTO_PATH);
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle;
var shed = new cattle_proto.CattleMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());
var client = new cattle_proto.DiaryMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());
var location = new cattle_proto.GrazingMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());

/***Cattle Monitoring Service***
* consists of:
* a unary function (cattleData) to request a tagID and render the related health information per animal from the server onto the web client
* a client-side stream (shedAirConditions) that takes air measurements within the shed 5 times a day and send it to the server to determine necessary actions
* a client-side steam (shedWaterConditions that takes  water measurements within the shed 5 times a day and send it to the server to determine necessary actions*/

router.get('/', function(req, res, next) {
  //unary grpc (cattleData)

  //requesting user input from index.js (tagID)
  var tagId = req.query.tagId;

  //determining if tagId is valid (needs to be above 0)
  if (tagId >= 1) {
    //passing through tadID to server and waiting for response
    //adding try/catch here to log possible errors
    try {
      shed.cattleData({tagId: tagId}, function (error, response) {
        try {
          res.render('index', {title: 'Animal Welfare Check', error: error, tagId:response.tagId, age: response.age, weight: response.weight, healthStatus:response.healthStatus, heatDetection:response.heatDetection});
        } catch (error) {
          console.log(error);
          res.render('index', {title: 'Animal Welfare Check', error: 'Unable to look up information'});
        }
      });
    } catch (error) {
      console.log(error);
      res.render('index', {title: 'Animal Welfare Check', error: 'Unable to look up information'});
    }
  } else {
    res.render('index', {title: 'Animal Welfare Check', error: 'Awaiting Tag-ID'});
  }
});

router.get('/shed', function(req, res, next) {
  //client-side side grps (shedAirConditions)
  
  //creating a new Promise() for data receiving from server so water and air conditions can render at the same time to the web page
  var airPromise = new Promise (function(resolve, reject){
    var call = shed.shedAirConditions(function(error, response){
      if(error){
          console.log("An error occured")
          reject(error);
      } else {
          resolve(response);
      }
    })
  
    /*
    * computing relevant data for air conditions within the shed (humidity, temperature, ammonia)
    * using Math.random() to generate random data as there are no physical sensors
    */ 
    for(var i=0; i<5; i++){
      var temperature = Math.random() * (45 - 10) + 10;
      var humidity = Math.random() * (80 - 40) + 40;
      var ammonia = Math.random() * 100;
      
      //sending data to the server
      call.write({
            temperature: temperature,
            humidity: humidity,
            ammonia: ammonia,
      })
    }
    call.end();
  })
  
  //creating a new Promise() for data receiving from server so water and air conditions can render at the same time to the web page
  var waterPromise = new Promise(function(resolve, reject){
    var call = shed.shedWaterConditions(function(error, response){
      if(error){
          console.log("An error occured")
          reject(error);
      } else {
          resolve(response);
      }
    })
  
    /*
    * computing relevant data for water conditions within the shed (humidity, temperature, ammonia)
    * using Math.random() to generate random data as there are no physical sensors
    */ 
    for(var i=0; i<5; i++){
      var waterQuality = Math.random() * 15;
      var waterQuantity = Math.random() * 400;
      
      //sending data to server
      call.write({
        waterQuality: waterQuality,
        waterQuantity: waterQuantity,
      })
    }
    call.end();
  })

  //error validation
  //once data has returned from the server, it is saved in a respective array per function and rendered on the webpage
  //used this as reference to implement Promise.all() - https://stackoverflow.com/questions/33073509/promise-all-then-resolve
  try{
    Promise.all([airPromise, waterPromise])
      .then(function(data){
      airResponse = data[0];
      console.log(data);
      waterResponse = data[1];
      console.log(data);

      res.render('shed', {
        title: 'Shed Monitoring',
        error: null,
        airAlertMessage: airResponse.airAlertMessage,
        avgTemperature: airResponse.avgTemperature,
        avgHumidity: airResponse.avgHumidity,
        avgAmmoniaLv: airResponse.avgAmmoniaLv,
        waterAlertMessage: waterResponse.waterAlertMessage,
        avgWaterQuality: waterResponse.avgWaterQuality,
        avgWaterQuantity: waterResponse.avgWaterQuantity,
        })
      })
  } catch(e){
    console.log(e);
  } 
});

/***Diary Monitoring Service***
* consists of:
* a unary function (productionExemption) to exempt an animal from the daily milking cycle for various reasons, here the tag-id is passed to the server for processing.
* a client-side stream (getDiaryOutput) which streams each animals current weight and milk output to the server after the milk cycle has finished, the server will then compute the necessary data (total output + problem areas to address).
* a server-side stream (getHistoricData) which streams sensor data saved on the server from the past year to the client, which will be rendered as charts on /news for analytical purposes. 
*/

router.get('/milk', async function(req, res, next) {

  //requesting user input from news.js (topic)
  var exclude = req.query.exclude;
  
  //error validation
  try {
    //awaiting function gatherData() for server-side stream to ensure the server-side stream finishes streaming first before res.render is called
    var diaryData = await gatherData(client.getHistoricData({}));

    //unary grpc passing the requested topic from the client to the server, returning a confirmation message that topic was saved for future news alerts. 
    var message;
    client.productionExemption({exclude:exclude}, function(error, response){
      if(error){
        console.error(error);
      } else {
        message = response.message;
        console.log(response.message);
      }
      //rendering the server responses for both methods to the webpage (/milk)
      res.render('milk', {diaryData, message});
    });
  } catch (e) {
    console.log(e);
    console.log('Could not fetch data.');
  }
});  

//creating a new promise, saving all data passed from the server into an array, once stream is finished promise is resolved or rejected
//https://www.freecodecamp.org/news/javascript-promise-tutorial-how-to-resolve-or-reject-promises-in-js/
function gatherData(call) {
  return new Promise((resolve, reject) => {
    var data = [];
    call.on('data', function(response) {
      console.log(data);
      data.push(response);
    });
    call.on('end', function() {
      resolve(data);
    });
    call.on('error', function(error) {
      reject(error);
    });
  });
}

router.get('/milkoutput', function(req, res, next) {
  //error validation
  try {
    //client-side grpc passing continous milk output per cow and current cattle weight during daily milk cycle
    var call = client.getDiaryOutput(function(error, response){
      if(error){
          console.log("An error occured")
      } else {
          /*Checking passed data in console first for troubleshooting if rendered incorrectly
            console.log(
            response.totalMilkOutput,
            response.totalCattleWeight,
            response.problematicMilkOutput,
            response.problematicCattleWeight,
          )*/
          res.render('milkoutput', {
            error:error,
            totalMilkOutput:response.totalMilkOutput, 
            totalCattleWeight: response.totalCattleWeight,
            problematicMilkOutput: response.problematicMilkOutput,
            problematicCattleWeight: response.problematicCattleWeight
          });
        }
    });
  
    /*
    * computing relevant data for current milking cycle (individual cattle milk output + cattle weight).
    * This data is then passed on the server to calculate daily output and check which animals need extra care as weight or milk output standards are not met. 
    */ 
    for(var i=0; i<12; i++){
      var milkOutput = Math.random() * 3;
      var cattleWeight = Math.random() * 400;
      
      //sending data to server
      call.write({
        milkOutput: milkOutput,
        cattleWeight: cattleWeight,
      })
    }

    call.end();
  
  //error validation
  } catch (e) {
    console.log(e);
    console.log('Could not fetch data.');
  }
});  

/***Grazing Monitoring Service***
* consists of:
* a client-side stream (grazingTrends) that passes on all locations the cattle has visited during grazing in the past 30 days as well as the overall time detected that the cattle was outside the shed grazing to the server.
* a unary grpc function (grazingBlocklist) that manually adds cattles to a grazing blocklist based on tagID and saves the information on the server. This might be necessary if the animal is close to giving birth, is sick or showed aggressive behavior. The blocklist is cleared regularly on intervals.
* a bidirectional stream (grazingLocation) that detects the tagID once the herd leaves the shed for grazing and sends the cattle location to the server in real-time intervals, the server will analyse the safety of the location based on geofencing data and returns real-time alerts based on the client-side stream.
** Once the tagId is detected at a specific location, the stream ends as the herd is back in the shed. 
*/

//client-side streaming
router.get('/grazing', function(req, res, next){
  //client-side streaming passing grazingLocation and time to the server on a daily basis for the past 30 days.
  var call = location.grazingTrends(function(error, response){

    console.log("index.js avoidLocations: " + response.avoidLocations);
    console.log("index.js safeLocations: " + response.safeLocations);

    //error validation at rendering
    if(error){
      console.log("An error occured")
    } else {
    res.render('grazing', {
      title: 'Grazing Trends', 
      error: error, 
      avoidLocations: response.avoidLocations, 
      safeLocations: response.safeLocations,
      });
    }
  });

  //calculating the locations and time spent out grazing. As no physical sensors are available, Math.random() was used for streaming.
  var grazingLocation;
  var time;
  for(var i=0; i<=30; i++){
    grazingLocation = (Math.floor(Math.random() * (11-1) + 1));
    time = (Math.floor(Math.random() * 5));
    
    //passing data to the server after each loop
    call.write({
      grazingLocation: grazingLocation,
      time: time,
    })
  }
  //ending the stream once data has passed through to the server
  call.end();
});

//function to remove the first value of the array after a 15 second interval
var blocklist = []
var message = "";
function removeValueAfterTimeout(array) {
  if(array.length > 1){
    setTimeout(() => {
      array.splice(0, 1);
      message = "Removing " + array[0].tagId + " from the blocklist"
    }, 15000);
  } else {
    message = "None removed from blocklist";
  }   
}

router.get('/grazingblocklist', function(req, res, next) {
  //requesting user input (tagId)
  var tagId = req.query.tagId;
  //checking if user input was logged correctly
  console.log(tagId);

  //checking if tagId is a valid number (needs to be above 0)
  if (tagId >= 1) {
    //error validation to return an error should the grazingBlocklist() function fail
    try {
      //unary rpc function
      location.grazingBlocklist({tagId: tagId}, function (error, response) {
        //pushing response into an array to pass blocklist onto webpage for full visibility
        blocklist.push({
          tagId: response.tagId,
          loggedDate: response.loggedDate,
          timeoutLength: response.timeoutLength
        });

        //removing cattle from the blocklist on set regular intervals (currently 15 seconds, but can be adjusted based on user's requirement)
        removeValueAfterTimeout(blocklist);

        //rendering data to webpage /grazingblocklist
        res.render('grazingblocklist', {
          title:'Grazing Blocklist', 
          error:error, 
          tagId:response.tagId, 
          loggedDate:response.loggedDate,
          timeoutLength: response.timeoutLength,
          blocklist,
          message
        });
      });
    } catch (error) {
      console.log(error);
    }
  //if tagId is not a number or 0, we inform the user that we are still waiting for a tagId.
  } else {
    res.render('grazingblocklist', {title: 'Grazing Blocklist',error: 'Awaiting Tag-ID',message});
  }
});

router.get('/grazinglocation', function(req, res, next) {
  
  //logging tagID of cattle that leaves shed, either automatically or per user input
  //var name = "test";
  var name = req.query.name;

  //bidirectional streaming grpc
  var call = location.grazingLocation();

  //rendering information to the screen in real-time
  call.on('data', function(response) {
    //res.render('location', {title: 'Location', name:response.name, message:response.message, location:response.location});
    console.log(response.message + " at location " + response.location)
  });

  //once stream ends (cattle is at a set location), the interval is cleared
  call.on('end', function(){
    clearInterval(locationUpdate);
  });

  //error validation
  call.on("error", function(e){
      console.log("Cannot connect to server")
  });

  //send initial message after tagId was detected
  call.write({
    message: name + " started grazing",
    name:name,
    location:0,
  });

  //setting up interval to send location updates every 2 seconds
  var locationUpdate = setInterval(() => {
  //location is randomly generated and based on location number is deemed safe, dangerous or the end of the route.
  var location = Math.random() *10;

    call.write(({
      message: name + " is safely grazing",
      name: name,
      location: location,
    }));

    if(location >=7 && location <=8){
      call.write(({
        message: name + " entered dangerous territory (mitigation efforts in place)",
        location:location,
        name: name,
      }))
    }

    if(location >= 9){
      call.write({
          message: name + " finished grazing",
          location:location,
          name: name,
      });
      clearInterval(locationUpdate);
    }
  }, 2000); 
});

module.exports = router;
