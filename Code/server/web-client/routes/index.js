var express = require('express');
var router = express.Router();
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var readlineSync = require('readline-sync')

var PROTO_PATH = __dirname + "/../protos/cattle.proto";
var packageDefinition = protoLoader.loadSync(PROTO_PATH);
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle;
var shed = new cattle_proto.CattleMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());
var client = new cattle_proto.NewsAlerts("0.0.0.0:40000",  grpc.credentials.createInsecure());
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
          res.render('index', {title: 'Animal Welfare Check', error: 'Unable to look up information', age: null});
        }
      });
    } catch (error) {
      console.log(error);
      res.render('index', {title: 'Animal Welfare Check', error: 'Unable to look up information', age: null});
    }
  } else {
    res.render('index', {title: 'Animal Welfare Check', error: 'Awaiting Tag-ID', age: null});
  }
});

//client-side streaming
router.get('/shed', function(req, res, next) {
  
  var call = shed.shedData(function(error, response){
    if(error){
        console.log("An error occured")
    } else {
        res.render('shed', {title: 'Shed Monitoring', error: error, alertMessage: response.alertMessage});
    }
  })

  for(var i=0; i<5; i++){
    var temperature = Math.random() * 40;
    var humidity = Math.random() * 100;
    var ammonia = Math.random() * 50;
    var waterQuality = Math.random() * 2;
    var waterQuantity = Math.random() * 10;
      
    call.write({
          temperature: temperature,
          humidity: humidity,
          ammonia: ammonia,
          waterQuality: waterQuality,
          waterQuantity: waterQuantity,
    })
  }
  
  call.end();
});

//server-side streaming
router.get('/news', function(req, res, next) {
  
  var call = client.getNewsAlerts({});
  var newsItems = [];

  call.on('data', function(response){
      newsItems.push({category: response.category, url:response.url});
  });

  call.on('end', function(){
    res.render('news', {newsItems:newsItems});
  });

  call.on('error', function(e){
    console.log(e);
  })
});

//---bidirectional streaming---

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
