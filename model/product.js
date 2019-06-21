var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	name:String,
	sku: String,
	categories:[Schema.Types.Mixed],
	allowAlarm: Boolean,
	allowSafeZone: Boolean,
	hasBluetooth: Boolean,
	sourceId: Schema.Types.ObjectId,
	createDate: {type:Date, default:Date.now},
	image: String,
})
