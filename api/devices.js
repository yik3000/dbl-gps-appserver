var express = require('express');
const bodyParser = require('body-parser');
var crudTool = require('../utility/crudtools.js');
var tokenTool = require('../utility/authHelper.js');
const DevicesSchema = require('../model/device.js');
const HeartbeatsSchema = require('../model/heartbeat.js');
const CustomerSchema = require('../model/customer.js');
const ProductsSchema = require('../model/product.js');
const databases = require('../db.js');
const async = require('async')


module.exports = function(app, deviceLibrary){
	var deviceRoutes = express.Router();
	deviceRoutes.use(tokenTool.analyze)	
	var db = databases.getConnection("gps",app.get("application"));
	var Devices = db.model("devices",DevicesSchema);
	var Products = db.model("products", ProductsSchema);
	var Heartbeats = db.model('heartbeats', HeartbeatsSchema);
	var Customers =	db.model("customers", CustomerSchema);

	deviceRoutes.use(bodyParser.json())

	deviceRoutes.post('/',function(req,res){
		identity = tokenTool.getIndentity(req);
		var id = identity._id;
		if(crudTool.ensure(req,res,['imei']) == false){return;}
		async.waterfall([
			function(next){
				Customers.findOne({_id:id}).exec(next)
			},
			function(customer, next){
				Devices.findOne({imei:req.body.imei}).populate('product').exec(function(err, device){
					next(err,customer,device)
				})
			},
			function(customer,device,next){
				if(device != null && customer != null){
					if(device.user != null && device.user != customer._id){
						return next("device already associate with someone else")
					}
					if(device.product == null)
					{
						return next("device does not associate to any product")
					}
					device.user = customer._id;
					var isContainDevice = customer.associatedDevices.indexOf(device._id);
					if(isContainDevice < 0){
						customer.associatedDevices.push(device._id);
					}
					else{
						return next("already associate to this device")
					}
					async.parallel({
						savedUser: function(cb) { customer.save(cb) },
						savedDevice: function(cb) { device.save(cb) }
						},function(err,results){
							next(err,results);
					})
				}
				else{
					return next("no device or user found");
				}
			}	
		], function(err, results){
			if(err){
				if(err == "no device or user found") { return crudTool.failed(res,"W002", "no device or user found")}
				if(err == "already associate to this device"){return crudTool.failed(res, "W003", "already associate with this device")}
				if(err == "device already associate with someone else"){return crudTool.failed(res, "W004", "device already associate with someone else")}
				if(err == "device does not associate to any product"){return crudTool.failed(res, "W007", "device does not associate to any product type")}
			}
			var device = results.savedDevice[0];
			if(device != null){
				var deviceType = { _id: device.product._id, name: device.product.name, sku: device.product.sku }
				return crudTool.success(res,{
					deviceid: device._id,
					deviceType: deviceType,
					isMainActor: true
				});	
			} else {
				return crudTool.failed(res, "W006", "failed to update device");
			}
		})
	});
	

	deviceRoutes.get('/',function(req,res){
		identity = tokenTool.getIndentity(req);
		var id = identity._id;
		Devices.find({user:id}).populate('product').then(devices => {
			if(devices.length > 0)
			{
				var mappedDevices = devices.map(function(device){
					return {
						deviceId: device._id,
						label: device.label,
						imei: device.imei,
						deviceType: {_id: device.product._id, name: device.product.name, sku: device.product.sku},
						isMainDevice: false,
						isRemoteAlarm: device.alarmActive,
						isSelectedEnclosure: device.safeZoneActive,
						enclosureRadius: device.safeZoneRadius,
						enclosureCenter: device.safeZone,
						name: device.wearingPersonName,
						sex: device.wearingPersonSex,
						age: device.wearingPersonAge,
						idCard: device.wearingPersonIdCard
					}
				});

				crudTool.success(res, {devices:mappedDevices});				
			} else {
				crudTool.success(res, {devices: []});
			}
		
		}).catch(err => crudTool.failed(res, err))
	})

	deviceRoutes.get('/all', function(req,res){
		identity = tokenTool.getIndentity(req);
		var id = identity._id;
		Devices.find({}).lean().populate('product').exec(function(err, devices){
			if(err) return crudTool.failed(res, "E002", err);
				return crudTool.success(res, {devices:devices})			
		});
	})

	deviceRoutes.get('/:deviceId', function(req,res){
		identity = tokenTool.getIndentity(req);
		var id = identity._id;
		Devices.findOne({_id:req.params.deviceId})
			.populate({path:'product'})
			//.populate('user')
			.lean().exec(function(err,device){
				if(err) return crudTool.failed(res, "E002", err);
				if(!device) return crudTool.failed(res, "W002", "device not exist");
				if(device.user != id && !identity.staff) { return crudTool.failed(res, "W003", "user cannot get this device");}

				return crudTool.success(res, { device: {
					deviceId: device._id, 
					label: device.label,
					imei: device.imei,
					deviceType: {_id: device.product._id, name: device.product.name, sku: device.product.sku},
					batteryLevel: device.batteryLevel,
					gpsSignal: device.gpsSignal, 
					northStarSignal: device.northStarSignal,
					gsmSignal: device.gsmSignal, 
					atSaftyZone: device.atSaftyZone,
					isSelectedEnclosure: device.safeZoneActive,
					enclosureRadius: device.safeZoneRadius,
					enclosureCenter: device.safeZone,
					location : device.location,
					lastSyncTime: device.lastSyncTime,
					name: device.wearingPersonName,
					sex: device.wearingPersonSex,
					age: device.wearingPersonAge,
					idCard: device.wearingPersonIdCard

				}})
			})
	})
	

	/*
	deviceRoutes.put('/:deviceId/alarm', function(req,res){
		if(!crudTool.ensure(req,res,['status'])){return;}
		identity = tokenTool.getIndentity(req);
		var userId = identity._id;		
		sendCommandToDevice(req.params.deviceId, userId, function(device, cb){
			if(req.body.status == "on"){
				command = deviceLibrary.getCommand("alarm-on",null);
				cb(null,command);
			}
			else if(req.body.status == "off"){
				command = deviceLibrary.getCommand("alarm-off",null);
				cb(null,command);
			}
			else return cb('invalid command');
		}, function(err,result){
			if(err) return crudTool.failed(res, "W02", err);
			else return crudTool.success(res);
		})
	})	
	*/

	deviceRoutes.put('/:deviceId/alarm', function(req,res){
		if(!crudTool.ensure(req,res,['status'])){return;}
		identity = tokenTool.getIndentity(req);
		async.waterfall([
			function(next){
				var deviceToPass = null;
				sendCommandToDevice(req.params.deviceId, identity._id, 
					function(device, cb){
						deviceToPass = device;
						if(req.body.status == "on"){
							command = deviceLibrary.getCommand("alarm-on",null);
							cb(null,command);
						}
						else if(req.body.status == "off"){
							command = deviceLibrary.getCommand("alarm-off",null);
							cb(null,command);
						}
						else return cb('invalid command');
				}, function(err,result){
					if(err) return next(err);
					else next(null, deviceToPass)
				})
			},
			function(device, next){
				if(req.body.status == 'on'){
					device.alarmActive = true;
				}
				else{
					device.alarmActive = false;
				}
				device.save(next)
			},
		], function(err, device){
				if(err){
					if(err =="device not found") return crudTool.failed(res, "W002", err);
					if(err =="user cannot update this device") return crudTool.failed(res, "W003", "user cannot get this device");
					else{
						return crudTool.failed(res,"W006",err)
					}					
				}
				return crudTool.success(res, { alarmStatus: device.alarmActive})
		})
	});
	deviceRoutes.get('/:deviceId/trail',function(req,res){
		identity = tokenTool.getIndentity(req);
	    var today = new Date();
	    var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
	    var theNextDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

		async.waterfall([
			function(next){ 
				Devices.findOne({_id:req.params.deviceId}).lean().exec(next); },
			function(device, next){ 
				if(!device) return next("device not found");				
				if((device.user == identity._id) || (identity.staff == true)){
					Heartbeats.aggregate([
						{
						        $match:{
						            imei: device.imei,
						            containsLocationData: true,
						            timestamp: {$gte: new Date(lastWeek), $lt:  new Date(theNextDay) }
						        }
						},
						{
						        $group: {
						            _id: {
						               year : { $year : "$timestamp" }, 
						               month : { $month : "$timestamp" }, 
						               day : { $dayOfMonth : "$timestamp" }, 
						            },
						            heartbeats: { $push: "$$ROOT" , }
						         }
						},
						{ "$sort": { "_id.year": -1, "_id.month":-1, "_id.day" : -1, "heartbeats.timestamp": 1 }},
						{
						    $project: {
						        heartbeats: { "$slice": ["$heartbeats", 5]},
						        _id: 1,        
						    }
						}
					]).exec(function(err,heartbeats){
							if(err) console.log(err); 
							next(err,device,heartbeats)
					});
				}
				else {
					return next("user cannot get this device")
				};
			}
		], function(err,device,heartbeats){
			if(err){
				if(err =="device not found") return crudTool.failed(res, "W002", err);
				if(err =="user cannot get this device") {
					return crudTool.failed(res, "W003", "user cannot get this device")
				}
				else{
					return crudTool.failed(res,"W006",err)
				}
			}
			var mappedHeartbeat = heartbeats.map(function(token){
				var mappedSubHeartbeats = token.heartbeats.map(function(heartbeat){
					return {
						time: heartbeat.timestamp,
						location: heartbeat.location,
					}
				})
				return {
					date: token._id,
					location: mappedSubHeartbeats,
				}
			})
			return crudTool.success(res,{
				total: mappedHeartbeat.length,
				pointDetail: mappedHeartbeat
			})
		})
	});
	

	function sendCommandToDevice(deviceId, userId, callbackForCommand, callbackWhenFinished)
	{
		async.waterfall([
			function(next){
				Devices.findOne({_id: deviceId}).exec(next)
			},
			function(device,next){
				if(device == null) return next("device not found")
				if(device.user != userId) return next("unable to change setting for this device");
				callbackForCommand(device, function(err, command){
					next(err,command, device);
				});
			},			
			function(command, device, next)
			{
				//console.log(command);
				deviceLibrary.sendMessage(device.imei, command).then(response=> next(null))
			}
		],function(err,result){
			callbackWhenFinished(err,result);
		});
	}



	deviceRoutes.put('/:deviceId/bluetooth', function(req,res){
		identity = tokenTool.getIndentity(req);
		var userId = identity._id;		
		sendCommandToDevice(req.params.deviceId, userId, function(device, cb){
				if(req.body.status == "on"){
					//if(device.bluetoothOn == true) return cb("bluetooth is already on");
					command = deviceLibrary.getCommand("bluetooth-on",null);
					cb(null,command);
				}
				else if(req.body.status == "off"){
					//if(device.bluetoothOn == false) return cb("bluetooth is already off");
					command = deviceLibrary.getCommand("bluetooth-off",null);
					cb(null,command);
				}
				else if(req.body.status == "clear"){
					command = deviceLibrary.getCommand("bluetooth-clear",null);
					cb(null,command);					
				}
				else return cb('invalid command');
		}, function(err,result){
			if(err) return crudTool.failed(res, "W002", err);
			else return crudTool.success(res);
		})
	})




	deviceRoutes.put('/:deviceId',function(req,res){
		identity = tokenTool.getIndentity(req);
		var userId = identity._id;		
		Devices.findOne({_id:req.params.deviceId}).exec(function(err,device){
			if(err) crudTool.failed(res,err);
			if(device)
			{
				if(device.user != userId && !identity.staff) {return crudTool.failed(res, "this device does not belong to the user")}
				if(identity.staff){
					device.product = req.body.product;
				}
				else{
					device.label = req.body.label;

					if(req.body.enclosureCenter != null){
						device.safeZone = req.body.enclosureCenter;	
					}
					if(req.body.enclosureRadius != null){
						device.safeZoneRadius = req.body.enclosureRadius;
					}

					device.wearingPersonName = req.body.name ? req.body.name : device.wearingPersonName;
					device.wearingPersonSex = req.body.sex ? req.body.sex : device.wearingPersonSex;
					device.wearingPersonAge = req.body.age ? req.body.age : device.wearingPersonAge;
					device.wearingPersonIdCard = req.body.idCard ? req.body.idCard : device.wearingPersonIdCard;
				}
				device.save(function(err,device){
					crudTool.respond(res,err,device)
				})			
			}
			else
			{
				crudTool.failed(res, "cannot find device")
			}
		})		
	})

	deviceRoutes.delete('/:deviceId',function(req,res){
		//if(crudTool.ensure(req,res,["deviceId"]) == false)return;
		identity = tokenTool.getIndentity(req);
		async.waterfall([
			function(next){
				var customerId = identity._id;
				if(req.body.hasOwnProperty("userId")){
					if(!identity.staff){
						return next("staff only function")
					}					
					customerId = req.body.userId;
				}
				Customers.findOne({_id:customerId}).exec(next);
			},
			function(customer,next){	
				if(!customer) return next("no customer found");
				Devices.findOne({_id: req.params.deviceId}).exec(function(err, device){
					if(!device){ return next("no device found")}
					next(err,customer,device);
				});
			},
			function(customer,device,next)
			{
				var index = customer.associatedDevices.indexOf(device._id)
				if(index>=0){
					customer.associatedDevices.splice(index,1);
				}
				else{
					return next("no device associated")
				}

				device.user = null;								
				async.parallel({
					saveUser: function(pcb){ customer.save(pcb)},
					saveDevice: function(pcb){ device.save(pcb)}
				}, function(err,result){
					if(err){
						next(err)
					}
					else{
						next(null,result);
					}
				});
			}], function(err, result){
				if(err){
					if(err == "no device associated") return crudTool.failed(res, "W003", "no such device associate to this account");
					else if(err == "staff only function") {return crudTool.failed(res, "W004", err)}
					else if(err == "no device found") { return crudTool.failed(res, "W005", err)}
					else if(err == "no customer found") { return crudTool.failed(res, "W002", err)}
					else return crudTool.failed(res, "W006", err);
				}
				return crudTool.success(res);
			}
		)
	});

	app.use('/devices',deviceRoutes);
}