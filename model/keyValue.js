var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	appId: String, 
	groupName: String,
	key: String,
	value: String,
})


