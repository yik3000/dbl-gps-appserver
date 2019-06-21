var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	version: String, 
	isUpdate: Boolean,
	isAppUpdate: Boolean,
	appSecret: String,
	isMaintain: Boolean,
	maintainEnd: String,
	updateTips: String,
	isShowSlide: Boolean,
	doubaolulink: String
})


