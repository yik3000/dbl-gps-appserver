var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	imei: String, 
	product: {type:Schema.Types.ObjectId, ref: "products", default: null},
	user: {type:Schema.Types.ObjectId, ref: "users"}, 
	label: String,

	mode: Number,	
	online: {type:Schema.Types.Boolean, default: false},
	batteryLevel: Number,
	gpsSignal: Number, 
	northStarSignal:Number,
	gsmSignal: Number, 

	bluetoothOn: {type: Schema.Types.Boolean, default: false},
	bluetoothConnected: {type: Schema.Types.Boolean, default:false},
	alarmActive: {type: Schema.Types.Boolean, default:false},
	wearingPersonName: String, 
	wearingPersonSex: String, 
	wearingPersonAge: Number, 
	wearingPersonIdCard: String,
	

	location: { type: [Number], index: '2dsphere'},
	lastReceiveMessage: String,
	lastSyncTime: Date,
	createdDate: Date,

	ip:String,
	port: Number,
})


