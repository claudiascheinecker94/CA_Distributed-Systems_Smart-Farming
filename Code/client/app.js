var readlineSync = require('readline-sync')
var grpc = require("@grpc/grpc-js")
var protoLoader = require("@grpc/proto-loader")
var PROTO_PATH = __dirname + "/protos/proto.proto"

var packageDefinition = protoLoader.loadSync(PROTO_PATH)
var proto = grpc.loadPackageDefinition(packageDefinition).package_name
var client = new proto.CalcService("0.0.0.0:40000", grpc.credentials.createInsecure());

