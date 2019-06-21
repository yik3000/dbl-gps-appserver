const net = require("net");
const Emitter = require('tiny-emitter');
const MessageLogSchema = require('../model/messagelog.js');
const databases = require('../db.js');
//const MessageLibrary = require('./message.js');
const async = require('async');

var server = null;
var activeTcpConnections = [];
//var host = HOST;
//var port = PORT;

function addDeviceIntoList(imei,socket)
{
		activeTcpConnections.push({
				imei:imei,
				ip:socket.remoteAddress,
				port:socket.remotePort,
				connectedTime: new Date(),
				socket:socket});
}
function removeDeviceFromListByImei(imei)
{
	activeTcpConnections =  activeTcpConnections.filter(function(connection){
		return connection.imei != imei;
	})
}
function removeDeviceBySocket(socket)
{
	activeTcpConnections =  activeTcpConnections.filter(function(connection){
		return connection.ip != socket.remoteAddress && connection.port != socket.remotePort;
	})	
}
function checkDeviceConnectionIntegrity(imei, socket)
{
	var filteredDevice = activeTcpConnections.filter(function(connection){
		return connection.imei === imei
	});
	if(filteredDevice.length > 1){
		return "remove";
	}
	else if(filteredDevice.length == 1){
		var connectedDevice = filteredDevice[0];
		if(connectedDevice.ip != socket.remoteAddress || connectedDevice.port != socket.remotePort){
				return "remove";
		}
		else{
			return "stay";
		}
	}
	else{
		return "add";
	}
}
function updateConnectionList(imei, socket)
{
	var result = checkDeviceConnectionIntegrity(imei,socket)
	switch(result)
	{
		case "remove":
			removeDeviceFromListByImei(imei);
			addDeviceIntoList(imei,socket);
			break;
		case "add":
			addDeviceIntoList(imei,socket);
			break;
		case "stay":
			break;
	}
};

module.exports = function SocketLibrary(HOST,PORT, applicationProfile, messageLibrary, heartbeatLibrary, locationLibrary) {
	var db = databases.getConnection("gps", applicationProfile);
	var MessageLog = db.model("messagelogs", MessageLogSchema);
	this.events = new Emitter();
	
	this.init = function(){
		events = this.events;
		server = net.createServer(function(socket){
			socket.on('close', function(data){
				async.parallel({
					parseMessage:function(callback){											
						events.emit('disconnect', {ip: socket.remoteAddress, port: socket.remotePort});		
					},
					removeDeviceFromSocket:function(callback){
						removeDeviceBySocket(socket);
						callback(null,null);
					}
				},function(err,result){
					if(err) console.log(err);
				})
			});
			socket.on('uncaughtException', function(err){
				console.log('fatal uncaught exception: ' + err);
			})
			socket.on('data', function(data){
	    		data = data.toString();
	    		async.waterfall([
	    			function(next){
	    				var messageLog = new MessageLog({data:data, ip: socket.remoteAddress})
	    				next(null, messageLog)
	    			},
	    			function(message, next){
	    				var messages = messageLibrary.parse(message.data, function(err, messages){
		    				if(messages == null || messages.length == 0){
		    					message.error = true;
		    					message.save()
		    					next("skip");
		    				}
		    				else{
		    					messages.forEach(function(messageIn){
			    					messageIn.ip = socket.remoteAddress;
				    				messageIn.port = socket.remotePort;	    						
		    					})
			    				next(null, messages, message);
		    				}    					
	    				});
	    			},
	    			function(processedMessages, rawMessage, next)
	    			{
	    				async.each(processedMessages,function(processedMessage, done){
		    				if(processedMessage.containsLocationData == true){
								locationLibrary.getLocationFromMessage(processedMessage, function(err,location){
									if(err) return done(err);
									processedMessage.location = [location.lon, location.lat];
									done(null);
								});					
							}
							else{
								done(null)
							}
	    				}, function(err){
		    				return next(err, processedMessages, rawMessage);
	    				})
	    			},
	    			function(processedMessages, rawMessage, next){	    	
	    				async.parallel({
	    					emitEvent:function(callback){
	    						processedMessages.forEach(function(processedMessage){
		    						events.emit('messageIn', processedMessage);
	    						})
	    					},
	    					updateConnectionPool:function(callback){
	    						imei = processedMessages[0].imei;
	    						updateConnectionList(imei,socket);
	    					},
							saveMessageToSystem:function(callback){
								async.each(processedMessages, function(processedMessage, done){
									heartbeatLibrary.insert(processedMessage, function(err,result){
										rawMessage.processedId = result._id;
										rawMessage.save();
										done(err);
									});
								}, function(err){
									callback(err)
								})
							},
	    				}, next);
	    			}
	    		],function(err,result){
	    			if(err && err != "skip") console.log(err);
	    		})
			}.bind(this));
		})
		server.listen(PORT, HOST, function(){
			console.log('tcp server is listening on ' + HOST + ':' + PORT);
		})
	}

	this.getConnectedDevices = function(callback){
	//	var promise = new Promise(function(resolve, reject){
			var result = activeTcpConnections.map(function(connection){
				return{
					imei: connection.imei,
					ip: connection.ip,
					port: connection.port,				
					connectedTime: connection.connectedTime,
				} 
			});

			callback(null, result);
	}

	this.getConnectedDevice = function(imei, callback){
		var filteredDevice = activeTcpConnections.filter(function(connection){
			return connection.imei === imei;
		})
		if(filteredDevice.length > 0){
			callback(null,filteredDevice[0]);
		}
		else{
			callback(null, null);
		}	
	}

}