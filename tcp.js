const async = require('async');
module.exports = function TcpServer(applicationProfile, socketLibrary, deviceLibrary, heartbeatLibrary, pushLibrary) {
	socketLibrary.events.on("disconnect", function(message){
		deviceLibrary.sendDeviceOffLine(message.ip, message.port, function(err,result){
			if(err) console.log(err);
		});
	})
	socketLibrary.events.on("messageIn", function(message){
		async.waterfall([
			function(next){
				deviceLibrary.getOrRegister(message.imei, next);
			},
			function(device,next){
				async.parallel({					
					updateDeviceFromMessage:function(callback){
						deviceLibrary.analyze(message, function(err,result){
							callback(err,result);
						})
					},
					processPushNotification:function(callback){
						pushLibrary.process(message, device, function(err,result){
							callback(err,result);
						});
					},
					detectPreviousSentMessage:function(callback){
						deviceLibrary.updateMessageConfirmation(message, function(err, result){
							callback(err,result);
						})
					},
					respondToMessageIfAny:function(callback){
						//socketLibrary.getConnectedDevice(message.imei, next)
						async.waterfall([
							function(next){
								deviceLibrary.respond(message, next);
							},	
							function(messages, next){
								if(messages != null){
									socketLibrary.getConnectedDevice(message.imei, 
										function(err,result){ 
											//console.log('finish 3-1');
											next(err, result, messages)
										})
								}
								else{
									//console.log('finish 3-1-1');
									next(null,null,null)
								}
							},
							function(connectedDevice, messages, next){
								if(connectedDevice == null || messages == null){
									//console.log('finish 3-2-1')
									next(null,null);
								}
								else{
									deviceLibrary.sendMessagesToClientRaw(connectedDevice.socket, messages, function(err,result){
										next(err,result);
									});
								}
							}					
						], function(err,result){
							//console.log('finishing 4');
							callback(err,result)
						})
					},
				}, function(err, result){
					next(err,result);
				})
			},
			function(parallelResult, next){
				//process out going message
				async.waterfall([
					function(next){
						socketLibrary.getConnectedDevice(message.imei, next)
					},
					function(connectedDevice, next){
						if(connectedDevice == null) return next('skip');
						deviceLibrary.getMessages(message.imei, function(err, messages){
							next(err, connectedDevice, messages);
						});								
					},
					function(device, messages, next){
						deviceLibrary.sendMessagesToClient(device.socket, messages, next)
					},
				],next)
			}
		],function(err,result){
			if(err){
				if(err != "skip"){
					console.log(err);
				}
			}
		})
	})
}