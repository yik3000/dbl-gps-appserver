var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	data:String,
	ip: String,
	processedId: {type:Schema.Types.ObjectId, ref: "heartbeat"},
	error: {type:Boolean, default:false},
	timestamp: {type:Date, default:Date.now},
})


