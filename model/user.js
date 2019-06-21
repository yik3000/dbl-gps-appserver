var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	createdDate: {type: Schema.Types.Date, default: new Date()}, 
	password: String,
	username: String,
	nickname: String,
	imageUrl: String,
	roles: [Schema.Types.Mixed],	
	companyId: Schema.Types.ObjectId,
	passwordReset: Boolean,
	lastUpdateBy: String,
})


