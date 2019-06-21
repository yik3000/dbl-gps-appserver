const DeviceSchema = require('../model/device.js');
const ClientMessageSchema = require('../model/messageOut.js');
//const DeviceStatusFactory = require('../classes/deviceStatusFactory.js');
const HeartbeatSchema = require('../model/heartbeat.js');

const async = require('async');
const databases = require('../db.js');

function pad (n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
function parseRequest(data)
{
	var regexForFirstPhase = /^\*MG20(\d)(\d*)(\w)(\w)/g;
	var result = {
		message: "",
		commandCategory: "",
		commandType: "",
	}
	result.message = data;
	parsedResult = regexForFirstPhase.exec(data)
	result.commandCategory = parsedResult[3];
	result.commandType = parsedResult[4];
	return result;	
}

function getRequestCommand(commandType, value)
{
	switch(commandType)
	{
		case "request-location":
			return "Requesting GPS Reading";
		case "bluetooth-on":
			return "Bluetooth On"
		case "bluetooth-off":
			return "Bluetooth Off"
		case "bluetooth-clear":
			return "Bluetooth Reset";
		case "alarm-on":
			return "Alarm on";
		case "alarm-off":
			return "Alarm Off";
		case "alarm-on-for-second":
			return "Alarm On for " + value + "minutes";
		case "reset":
			return "Reset Device";
		case "shutdown":
			return "Shutdown";
		case "mode-standby":
			return "Go into Standby mode";
		case "mode-alert":
			return "Alert Mode Activated";
		case "mode-alert-for-minutes":
			return "Alert Mode Activated for " + value + "minutes";			
		case "mode-flight":
		case "mode-flight-duration":
			return "Flight Mode";
		case "mode-antitheif":
			return "Sentry Mode Activated";
		case "mode-sleep-for-minute":
			return "Sleep mode for "+ value + "minutes";
		case "mode-flight-for-range":
			//value: {fromHour,fromMinute, toHour, toMinute}
			return "Flight mode from " + pad(value.fromHour,2) + ":" + pad(value.fromMinute,2) + " to " + pad(value.toHour,2) + ":" + pad(value.toMinute, 2);
		case "set-sleepmode-in-minutes":
			return value + " seconds then sleep mode activated";
		case "set-heartbreat-freq-in-second":
			return "Set heartbeat for every " + value  + "seconds";
		case "set-repsond-frquency":
			return "Device to respond every "+ value + "seconds";		
		case "report":
			return "Respond Now";
	}
}

function getRequestValue(commandType, value)
{
		switch(commandType)
		{
			case "request-location":
				return "*MG2001BE#";
			case "bluetooth-on":
				return "*MG2011BD(8,1)#"
			case "bluetooth-off":
				return "*MG2011BD(8,0)#"
			case "bluetooth-clear":
				return "*MG2011BD(8,2)#";
			case "alarm-on":
				return "*MG2011BD(J,FF)#";
			case "alarm-off":
				return "*MG2011BD(J,00)#";
			case "alarm-on-for-second":
				return "*MG2011BD(J,"+ pad(value,2) +")#";
			case "reset":
				return "*MG2001BA0#";
			case "shutdown":
				return "*MG2011AH(P4,0,0)#";
			case "mode-standby":
				return "*MG2011AH(P0,0,0)#";
			case "mode-alert":
				return "*MG2011AH(P1,0,0)#";
			case "mode-alert-for-minutes":
				return "*MG2011AH(P1,0," + pad(value,2) + ")#";			
			case "mode-flight":
				if(value){
					return "*MG2011AH(P2,0,"+ pad(value,2)+")#";
				}
				else{
					return "*MG2011AH(P2,0,0)#";
				}
			case "mode-flight-duration":
				return "*MG2011AH(WA,"+ value +")#";
			case "mode-antitheif":
				return "*MG2011AH(P5,0,0)#";
			case "mode-sleep-for-minute":
				return "*MG2011AH(P6,0,"+ pad(value,2)+")#";
			case "mode-flight-for-range":
				//value: {fromHour,fromMinute, toHour, toMinute}
				return "*MG2011AH(WA," + pad(value.fromHour,2) + pad(value.fromMinute,2) + pad(value.toHour,2) + pad(value.toMinute, 2) + ")#";
			case "set-sleepmode-in-minutes":
				return "*MG2011AH(T," + pad(value,2) + ")#";
			case "set-heartbreat-freq-in-second":
				return "*MG2011Bk1," + pad(parseInt(value.toString(16)),4) + "#";
			case "set-repsond-frquency":
				return "*MG2011Bi3,"+ pad(parseInt(value.toString(16)),4) + "FFFF#";
			case "report":
				return "*MG2000AJ#";
		}
}



module.exports = function DeviceLibrary(applicationProfile) {
	var db = databases.getConnection("gps", applicationProfile);
	const ClientMessage = db.model("clientmessages", ClientMessageSchema);
	const Devices = db.model("devices", DeviceSchema);
	const Heartbeats = db.model('heartbeats', HeartbeatSchema);

	var insertMessage = function(imei, message, callback)
	{
		var clientMessage = new ClientMessage({
				imei: imei, 
				command: message.command,
				value: message.value,
				sent: false,
				confirmed: false,
				sentDate: null,
				createdDate: new Date(),
		})
		clientMessage.save(function(err,result){
			callback(err,result);
		});
	}



	var registerDevice = function(imei, callback)
	{
		var device  = new Devices({
			imei : imei,
			user: null, 
			product: null,
			bluetoothOn:false,
			safeZone: [0,0],
			safeZoneRadius: 10,
			mode: 0,
			lastSyncTime: new Date(),
			createdDate: new Date()		 
		}) 
		device.save(callback)
	}


	this.getCommand = function(commandType, value)
	{
		var value = getRequestValue(commandType, value);
		var commandString = getRequestCommand(commandType,value);
		return {command: commandString, value: value}
	}
	
	
	this.getOrRegister = function(imei, callback){
		Devices.findOne({imei:imei}).exec(function(err,device){
			if(err) return callback(err);
			if(device == null){
				registerDevice(imei,function(err,device){
					callback(err,device);
				});
			}
			else{
				callback(null,device);
			}
		});
	}

	var updateDeviceCommonStatus = function(device, message)
	{
		if(message.content.battery){
			device.batteryLevel = message.content.battery;
		}
		if(message.content.gsmSignal){
			device.gsmSignal = message.content.gsmSignal;
		}
		if(message.content.gpsSignal){
			device.gpsSignal = message.content.gpsSignal;
		}
		if(message.content.northStarSignal){
			device.northStarSignal = message.content.northStarSignal;
		}
	}

	var updateProcessors = [
		{
			commandCategory : 'A', commandType: 'H', 
				callback: function(message,device){
					updateDeviceCommonStatus(device, message);
				}
		},
		{
			commandCategory : 'B', commandType: 'A', 
				callback: function(message,device){
					updateDeviceCommonStatus(device, message);
				}
		},
		{ 
			commandCategory : 'A', commandType: 'B', 
				callback: function(message,device){
					device.online = true;
					device.ip = message.ip;
					device.port = message.port;
				}
		},
		{ 
			commandCategory : 'G', commandType: 'A', 
				callback: function(message,device){
					if(message.content.bluetoothStatusValue == '3'){
						device.bluetoothOn = false;
						device.bluetoothConnected = false;
					}
					if(message.content.bluetoothStatusValue == '2'){
						device.bluetoothOn = true;
					}
					if(message.content.bluetoothStatusValue == '0'){
						device.bluetoothConnected = true;
						device.bluetoothOn = true;
					}
					if(message.content.bluetoothStatusValue == '1'){
						device.bluetoothConnected = false;
					}
				}
		},
		{ 
			commandCategory : 'A', commandType: 'W', 
				callback: function(message,device){
					if(message.content.type = 'V')
					{
						device.mode = parseInt(message.content.mode) || 0;
					}
				}
		},
		{
			commandCategory : 'A', commandType: 'A', 
				callback: function(message,device){
					updateDeviceCommonStatus(device, message);
				}			
		},
		{
			commandCategory : 'Y',
				callback: function(message,device){
					if(message.content.commandCategory == 'A' && message.content.commandType == 'W'){
						//console.log(device);						
					}
				}
		}
	]
	
	this.updateMessageConfirmation = function(message, callback){
		async.waterfall([
			function(next){
				if(message.commandCategory != "Y"){
					next("skip");
				}
				else{
					next(null);
				}
			},
			function(next){
				ClientMessage.find({imei:message.imei, 
									confirmed: false, 
									createdDate: { $gt: new Date() - 1000 * 60 * 1 }
									}).exec(next);
			},
			function(messages,next){
				var filtered = messages.filter(function(messageItem){
					var parsedMessage = parseRequest(messageItem.value);					
					return parsedMessage.commandCategory == message.content.commandCategory 
							&& parsedMessage.commandType == message.content.commandType
				})
				if(filtered && filtered.length > 0){
					next(null,filtered[0])
				}			
				else{
					next('skip');
				}	
			},
			function(message, next){
				message.confirmed = true;
				message.save(next);
			}
		],function(err,result){
			if(err == "skip") callback(null);
		})
	}

	this.analyze = function(message, callback)
	{
		async.waterfall([
			function(next){
				Devices.findOne({imei:message.imei}).exec(next)		
			},
			function(device,next){
				if(device == null) return next("no device found");
				var condition = updateProcessors.find(function(processor){
					if(processor.commandType)
					{
						if((message.commandCategory == processor.commandCategory) &&
							(message.commandType == processor.commandType)){
							return true;
						}						
					}
					else{
						if(message.commandCategory == processor.commandCategory){
							return true;
						}					
					}
				})
				if(condition != null){
					condition.callback(message, device);
				}
				if(message.containsLocationData){
					device.location = message.location;							
				}
				//update when change in schema				
				if(device.bluetoothOn == null) device.bluetoothOn = false;
				if(device.bluetoothConnected == null) device.bluetoothConnected = false;

				device.lastReceiveMessage = message.message;
				device.lastSyncTime = new Date();
				device.save(next)
			},
		], callback);
	}

	this.respond = function(message, callback)
	{
		switch(message.commandCategory)
		{
			case "A":
				if(message.commandType == "B")
				{
					async.waterfall([
						function(next){
							var message1 = {imei: message.imei, command: "Reply to client response step 1", value: "*MG20YAB#"};
							next(null,message1);
						},
						function(message1, next){
							var date = new Date();
							str = date.getFullYear().toString() 
								+ (('0' + (date.getMonth()+1)).slice(-2)).toString()
								+ (('0' + date.getDate()).slice(-2)).toString()
								+ (('0' + date.getHours()).slice(-2)).toString()
								+ (('0' + date.getMinutes()).slice(-2)).toString()
								+ (('0' + date.getSeconds()).slice(-2)).toString()							
							var message2 = {imei: message.imei, command: "Reply to client response step 2", value: "*MG2010DE("+str+")#"};
							next(null, message1, message2)
						},
						function(message1, message2, next){
							var message3 = {imei: message.imei, command:"Syncing Status", value: "*MG2000AJ#"}
							next(null,message1,message2, message3)
						}
					], function(err, message1, message2, message3){
						callback(err, [message1,message2, message3]);
					})
				}
				if(message.commandType == "H"){
					async.waterfall([
						function(next){
							var message1 = {imei: message.imei, command: "Reply to heartbeat", value: "*MG20YAH#"};
							next(null,message1);							
						}
					],function(err,result){
						callback(err, [result])
					})
				}
				break;
			default:
				callback(null,null)
				break;
		}
	}
	this.getMode = function(modeValue){
		switch(modeValue)
		{	
			case '0':
				return "Normal Mode";
			case '5':
				return "Sentry Mode";
			case '1':
				return "Danger Mode";
			case '2':
				return "Standby Mode";
			case '6':
				return "Sleep Mode";
		}
	}

	this.getMessages = function(imei, callback)
	{
		ClientMessage.find({imei: imei, sent: false}).sort({createdDate:1})
			.exec(callback)
	}

	this.sendDeviceOffLine = function(ip, port, callback){
		Devices.findOne({ip:ip, port: port}).exec(function(err,device){
			if(err) return callback(err);
			if(device == null) return callback("device not found");
			if(device.online == false) return callback("device already offline");
			device.online = false;
			device.save(callback);
		});
	}
	this.sendMessagesToClientRaw = function(socket, messages, callback){
		var count = 0;
		async.whilst(
			function(){ return count < messages.length; },
			function(callback){
					var message = messages[count];
					count ++;
					socket.write(message.value,null,function(){
						setTimeout(function(){
							callback(null, count)
						},500)
					})
				//},100)
			},callback)
	}
	this.sendMessagesToClient = function(socket, messages, callback)
	{
		var actions = [];
		for(var i = 0, len = messages.length; i < len; i++)
		{
			var message = messages[i];
			if(message.value != null)
			{
				var promise = new Promise((resolve, reject) => {
					socket.write(message.value);
					message.sent = true;
					message.confirmed = false;
					message.sentDate = new Date();
					message.save(function(err,result){ 
						if(err) reject(err);
						else resolve(result); 
					})
				})				
				actions.push(promise);
			}
			else
			{
				console.log('seeing empty package, skipping ');
				var promise = new Promise((resolve, reject) => {
					message.value = 'skipping empty package'
					message.sent = true;
					message.confirmed = true;
					message.sentDate = new Date();
					message.save(function(err,result){ 
						if(err) reject(err)
						else resolve(result); 
					})		
				});
				actions.push(promise);
			}
		}
		Promise.all(actions).then(function(results){
			callback(null, results);
		}).catch(function(err){
			callback(err);
		})
	}
}
