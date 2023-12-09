var express = require('express');
var router = express.Router();
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

var PROTO_PATH = __dirname + "/../protos/cattle.proto";
var packageDefinition = protoLoader.loadSync(PROTO_PATH);
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle;
var shed = new cattle_proto.CattleMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());
var client = new cattle_proto.NewsAndStatistics("0.0.0.0:40000",  grpc.credentials.createInsecure());
var location = new cattle_proto.GrazingMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());

router.use((req, res, next) =>{
  console.log(`${req.method}:${req.url}`)
  next();
})
/* GET home page. */
//unary grpc
router.get('/', function(req, res, next) {
  var tagId = req.query.tagId;

  if (tagId >= 1) {
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

//client-side streaming

router.get('/shed', function(req, res, next) {
  
  var call = shed.shedAirConditions(function(error, response){
    if(error){
        console.log("An error occured")
    } else {
        res.render('shed', {
          title: 'Air Monitoring', 
          error: error, 
          alertMessage: response.alertMessage, 
          avgTemperature: response.avgTemperature, 
          avgHumidity: response.avgHumidity,
          avgAmmoniaLv: response.avgAmmoniaLv
        });
    }
  })

  for(var i=0; i<5; i++){
    var temperature = Math.random() * (45 - 10) + 10;
    var humidity = Math.random() * (80 - 40) + 40;
    var ammonia = Math.random() * 100;
      
    call.write({
          temperature: temperature,
          humidity: humidity,
          ammonia: ammonia,
    })
  }
  call.end();
});

router.get('/water', function(req, res, next) {
  
  var call = shed.shedWaterConditions(function(error, response){
    if(error){
        console.log("An error occured")
    } else {
        res.render('water', {
          title: 'Water Monitoring', 
          error: error, 
          alertMessage: response.alertMessage, 
          avgWaterQuality: response.avgWaterQuality,
          avgWaterQuantity: response.avgWaterQuantity,
        });
    }
  })

  for(var i=0; i<5; i++){
    var waterQuality = Math.random() * 15;
    var waterQuantity = Math.random() * 400;
      
    call.write({
      waterQuality: waterQuality,
      waterQuantity: waterQuantity,
    })
  }
  call.end();
});


//server-side streaming

router.get('/news', async function(req, res, next) {

  var topic = req.query.topic;
  
  try {
    var newsItems = await gatherData(client.getNewsAlerts({}));
    var temp = await gatherData(client.getHistoricData({}));

    var message;
    client.futureTopics({topic:topic}, function(error, response){
      if(error){
        console.error("Error making gRPC call:", error);
        return next(error);
      } else {
        message = response.message;
        console.log(response.message);
      }

      res.render('news', { newsItems, temp, message});
    });
  } catch (e) {
    console.log(e);
    console.log('Could not fetch data.');
  }
});  

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

//client-side streaming
router.get('/grazing', function(req, res, next){
  var call = location.grazingTrends(function(error, response){

    console.log("index.js avoidLocations: " + response.avoidLocations);
    console.log("index.js safeLocations: " + response.safeLocations);

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

  var grazingLocation;
  var time;
  for(var i=0; i<=30; i++){
    grazingLocation = (Math.floor(Math.random() * (10-1) + 1));
    time = (Math.floor(Math.random() * 5));
      
    call.write({
      grazingLocation: grazingLocation,
      time: time,
    })
  }
  call.end();
});

var message = "";
function removeValueAfterTimeout(array) {
    setTimeout(() => {
      array.splice(0, 1);
      message = "Removed " + array[0].tagId + " from the blocklist"
    }, 15000);
}

var blocklist = []

//unary streaming
router.get('/blocklist', function(req, res, next) {
  var tagId = req.query.tagId;
  console.log(tagId);

  if (tagId >= 1) {
    try {
      location.grazingBlocklist({tagId: tagId}, function (error, response) {
        console.log(response.tagId);
        blocklist.push({
          tagId: response.tagId,
          loggedDate: response.loggedDate,
          timeoutLength: response.timeoutLength
        });

        //need to revisit
        removeValueAfterTimeout(blocklist);

        res.render('blocklist', {
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
  } else {
    res.render('blocklist', {title: 'Grazing Blocklist', error: 'Awaiting Tag-ID'});
  }
});
//bidirectional streaming

router.get('/location', function(req, res, next) {
  var name = "test";
  //var name = req.query.name;
  //readlineSync.question("Who is leaving the shed? ")
  var call = location.grazingLocation();

  call.on('data', function(response) {
    //res.render('location', {title: 'Location', name:response.name, message:response.message, location:response.location});
    console.log(response.message + " at location " + response.location)
  });

  call.on('end', function(){
    clearInterval(locationUpdate);
  });

  call.on("error", function(e){
      console.log("Cannot connect to server")
  });

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

});

module.exports = router;
