const DeviceSchema = require('../model/device.js');
const async = require('async');
const databases = require('../db.js');

var SmsUtil = require('./sms.js');
const Client = require('node-rest-client').Client;

const pushServiceLocation = "https://api.jpush.cn/v3/push";
function post(url, args, done){
	var client = new Client();
	client.post(url, args, function(data, response){
		return done(null,data,response);
	}).on('error',function(err){
		return done(err);
    })   
}


function push(message, userId, extra, done)
{
	if(!userId) {
		if(done) return done("push notification not delievered: user id is null");
		else {
			console.log("push notification not delivered: user id is null");
			return;
		}
	} 

	var data = {
		platform: 'all',
		audience: {
			alias: [userId]
		},
		notification: {
			android: {
				alert: message,
				title: 'Dubaolu Smart Apperalle',
				builder_id:1,
				extras: extra
			},
			ios: {
				alert: message,
				sound: "default",
				badge: "+1",
 				extras: extra
			}
		},
		message:{
			msg_content: message,
			content_type: 'text',
			title:"Dubaolu Smart Apperalle",
			extras:extra
		},
		options: {
//		        "time_to_live": 60,
//		        "apns_production": false
		    }
    }

    var buffer = new Buffer('a5a6c801ffa29b7a11d19baa:4d6977fb757f64f2d8486a43');
    var base64 = buffer.toString('base64');

    var args = {
    	headers: {
    		"Content-Type": "application/json",
	    	Authorization: 'Basic ' + base64,
    	},
    	data: data
    }
	post(pushServiceLocation, args, function(err,data,response){
		if(done){
			done(err,data,response);
		}
	})
}

module.exports = function MessageLibrary(applicationProfile, deviceLibrary) {
	var db = databases.getConnection("gps", applicationProfile);
	const Devices = db.model("devices", DeviceSchema);

	var pushProcessors = [
		{ 
			commandCategory : 'A', commandType: 'W', 
				callback: function(message,device){
					if(message.content.type = 'V'){
						if(message.content.type == 'V') {
							if(device.mode.toString() != message.content.mode){
								push('Device entering [' + deviceLibrary.getMode(message.content.mode) + ']', 
										device.user,
										{ deviceId: device._id, type:'device'});	

							}
						}
					}
				}
		},
		{ 
			commandCategory : 'G', commandType: 'A', 
				callback: function(message,device){
					if(message.content.bluetoothStatusValue == '2' && device.bluetoothOn == false){
						push('Bluetooth turned on for device', device.user, {deviceId: device._id, type: 'device'});	
						//SmsUtil.test();					
					}
					if(message.content.bluetoothStatusValue == '3' && device.bluetoothOn == true){
						push('Bluetooth turned off for device', device.user, {deviceId: device._id, type: 'device'});	
					}
					if(message.content.bluetoothStatusValue == '0'){
						push('Bluetooth connected', device.user, {deviceId: device._id, type: 'device'});	
					}
					if(message.content.bluetoothStatusValue == '1'){
						push('Bluetooth disconnected', device.user, {deviceId: device._id, type:'device'});	
					}

				}
		},
		{
			commandCategory : 'A', commandType: 'A', 
				callback: function(message,device){
					if(message.content.battery != null){
						push('Low Battery [' + message.content.battery + '%]', device.user, {deviceId: device._id, type:'device'});							
					}
				}			
		},
	]

	this.process = function(message, device, callback)
	{
	
		if(device == null) return callback("no device found");
		var condition = pushProcessors.find(function(processor){
			if((message.commandCategory == processor.commandCategory) &&
				(message.commandType == processor.commandType)){
				return true;
			}
		})
		if(condition != null){
			condition.callback(message, device);
		}
		return callback(null);

	}
}