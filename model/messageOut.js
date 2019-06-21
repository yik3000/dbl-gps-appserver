var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	imei: String, 
	command: String,
	value: String,
	sent: Boolean,
	confirmed: {type: Boolean, default:false},
	sentDate: Date,
	createdDate: Date,
	retry: {type:Number, default:0}
})

