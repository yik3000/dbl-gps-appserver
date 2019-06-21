var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	code: String,
	timestamp: {type:Date, default:Date.now},
	phoneNumber: String,
	verified: {type: Boolean, default:false},
	type: { type: Number, default: 0},
	customerId: { type: Schema.Types.ObjectId, ref: 'customer'},
	attempt: {type:Number, default: 0},
},{ capped: { size: 1024, max: 1000, autoIndexId: true }});


