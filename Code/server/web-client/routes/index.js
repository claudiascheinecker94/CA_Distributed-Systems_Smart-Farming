var express = require('express');
var router = express.Router();
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

var PROTO_PATH = __dirname + "/../protos/cattle.proto";
var packageDefinition = protoLoader.loadSync(PROTO_PATH);
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle;
var shed = new cattle_proto.ShedMonitoring("0.0.0.0:40000",  grpc.credentials.createInsecure());

/* GET home page. */
router.get('/', function(req, res, next) {

  var number1 = req.query.number1
  var number2 = req.query.number2
  var result
  /*var temperature = Math.random() * 40;
  var humidity = Math.random() * 100;
  var ammonia = Math.random() * 100;
  var waterQuality = "good";
  var waterQuanity = Math.random() * 10;
  
  var call = shed.shedData(function(error, response){
    if(error){
        console.log("An error occured")
    } else {
        console.log(response.alertMessage);
    }
  })*/

  if(!isNaN(number1) && !isNaN(number2)){
    try{
      shed.add({ number1: number1, number2: number2 }, function (error, response){
        try {
          res.render('index', {title: 'GRPC Calculator', error: error, result: response.result });
        } catch (error){
          console.log(error)
          res.render('index', {title: 'GRPC Calculator', error: 'Calculator Service is not available at the moment, please try again later', result: null });
        }
      });
    } catch (error){
      console.log(error)
      res.render('index', {title: 'GRPC Calculator', error: 'Calculator Service is not available atthe moment please try again later', result: null});
    }
  } else {
    res.render('index', {title: 'GRPC Calculator', error: null, result: result })
  }
});
    
 /* call.write({
      temperature: temperature,
      humidity: humidity,
      ammonia: ammonia,
      waterQuality: waterQuality,
      waterQuanity: waterQuanity,
  })
  
  call.end()*/

module.exports = router;

