var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	associatedDevices: [{type:Schema.Types.ObjectId, ref: "device"}],
	email: { type: String, unique: true },
	password: String,
	username: String,
	nickname: String,
	verified: {type: Schema.Types.Boolean, default:false}
	acceptTnC: {type: Schema.Types.Boolean, default:false},
	smsNotificationEnabled: {type: Schema.Types.Boolean, default: false},	
	address: String,
	imageUrl: String, 
	sex: String,
	registeredDate: {type: Schema.Types.Date, default: null}, 
	createdDate: {type: Schema.Types.Date, default: new Date()}, 
	lead: String
})