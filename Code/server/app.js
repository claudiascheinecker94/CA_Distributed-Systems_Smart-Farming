var grpc = require("@grpc/grpc-js")
var protoLoader = require("@grpc/proto-loader")
var PROTO_PATH = __dirname + "/protos/cattle.proto"
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH
)
var cattle_proto = grpc.loadPackageDefinition(packageDefinition).cattle


//client-side streaming
function shedData(call, callback){
    try{
        var number1 = parseInt(call.request.number1)
        var number2 = parseInt(call.request.number2)
        if(!isNaN(number1) && !isNaN(number2)){
            var result = number1 + number2
            callback(null, {
                message: undefined,
                result: result
            })
        } else {
            callback(null, {
                message: "Please specify two numbers"
            })
        }
    } catch (e) {
        callback(null, {
            message: "An error occurred during computation"
        })
    }  
}
  /*var tempIncrease = false;
  var tempDecrease = false;
  var activateDehumidifier = false;
  var addWater = false;
  var adjustFood = false;
  var alertMessage = "Actions taken: ";

  call.on('router', function(request){
    if(request.temperature < 20.00){
      tempIncrease = true;
      alertMessage += "temperature increased, ";
    }

    if(request.temperature > 27.00){
      tempDecrease = true;
      alertMessage += "temperature decreased, ";
    }
    
    if(request.humidity > 70){
      activateDehumidifier = true;
      alertMessage += "dehumidifier activated, ";
    }

    if(request.humidity < 40){
      activateDehumidifier = false;
      alertMessage += "dehumidifier deactivated, ";
    }

    if(request.waterQuality === "poor" || request.waterQuantity < 4){
      addWater = true;
      alertMessage += "water added, ";
    }

    if(request.ammonia > 30.00){
      adjustFood = true;
      alertMessage += "food adjusted to combat ammonia, ";
    }

  })

  call.on("end", function(){
    callback(null, {
      alertMessage: alertMessage,
    })
  })

  call.on('error', function(e){
    console.log("An error occured")
  })
}*/

/*//server-side streaming
var news = [
  {
    category: "Weather alert",
    news: "Placeholder"
  },
  {
    category: "System update",
    news: "Placeholder"
  },
  {
    category: "Current news",
    news: "Placeholder"
  },
  {
    category: "Privacy & Legal",
    news: "Placeholder"
  },
  {
    category: "Statistics",
    news: "Placeholder"
  }
]

function getNewsAlerts(call, callback) {
  for(var i = 0; i < news.length; i++){
    call.write({
      category: news[i].category,
      news: news[i].news
    })
  }
  call.end()
}*/

//bidirectional streaming*/


var server = new grpc.Server()
server.addService(cattle_proto.ShedMonitoring.service, {shedData:shedData});
//server.addService(cattle_proto.GrazingMonitoring.service, {grazingLocation:grazingLocation});
//server.addService(cattle_proto.NewsAlerts.service, {getNewsAlerts:getNewsAlerts});
server.bindAsync("0.0.0.0:40000", grpc.ServerCredentials.createInsecure(), function() {
  server.start()
})
