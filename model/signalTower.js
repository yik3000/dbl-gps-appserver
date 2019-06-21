var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = Schema({
	country:String,
	carrier: Number,
	lac: String, 
	cellId: String, 
	label: String,
	radius: Number,
	coordinate: { type: [Number], index: '2dsphere'} 
})


