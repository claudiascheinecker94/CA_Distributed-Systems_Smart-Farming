var express = require('express');
var router = express.Router();
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

var PROTO_PATH = __dirname + "/../protos/cattle.proto";
var packageDefinition = protoLoader.loadSync(PROTO_PATH);
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle;
var shed = new cattle_proto.ShedMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());
var client = new cattle_proto.NewsAlerts("0.0.0.0:40000",  grpc.credentials.createInsecure());

/* GET home page. */
//creating random variables as data, calling the shedData function and passing in the data, when call ends, the alertMessage should be returned and displayed on the web browser
router.get('/', function(req, res, next) {
  
  var call = shed.shedData(function(error, response){
    if(error){
        console.log("An error occured")
    } else {
        res.render('index', {title: 'Shed Monitoring', error: error, alertMessage: response.alertMessage});
    }
  })

  for(var i=0; i<5; i++){
    var temperature = Math.random() * 40;
    var humidity = Math.random() * 100;
    var ammonia = Math.random() * 50;
    var waterQuality = "good";
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

router.get('/news', function(req, res, next) {
  
  var call = client.getNewsAlerts({});

  call.on('data', function(response){
      res.render('news', {title: 'News', news:response.news, category:response.category});
      //console.log("Category: " + response.category + " News: " + response.news)
  });

  call.on('end', function(){

  });

  call.on('error', function(e){
    console.log(e);
  })
});


/*//---bidirectional streaming---
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
*/

module.exports = router;
