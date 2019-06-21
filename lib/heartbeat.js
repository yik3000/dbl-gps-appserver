const HeartbeatSchema = require('../model/heartbeat.js');
const databases = require('../db.js');

module.exports = function HeartbeatLibrary(applicationProfile) {
	var db = databases.getConnection("gps", applicationProfile);
	Heartbeat = db.model("heartbeats", HeartbeatSchema);
	this.insert = function(data, callback)
	{
		var heartbeat = new Heartbeat(data);
		heartbeat.save(callback)
	}

}