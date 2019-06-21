	var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	message:String,
	imei: String, 
	needToRespond: Boolean, 
	commandCategory: String, 
	commandType: String, 

	content: {type: Schema.Types.Mixed},
	commands:[{type:Schema.Types.Mixed}], 	

	containsLocationData: {type: Schema.Types.Boolean, default: false},
	location:  { type: [Number], index: '2dsphere'},


	systemMessage:String,
	statusMemo: String,


	//for heartbeats only
	batteryLevel: Number,
	gsmSignal: Number,
	positioningMethod: String,
	towerSignals:[{type: Schema.Types.Mixed}],
	//*********

	timestamp: {type:Date, default:Date.now},
})

