const Watcher = require('./lib/watcher.js');
const async = require('async');
const ClientMessageSchema = require('./model/messageOut.js');
const databases = require('./db.js');

module.exports = function WatchServer(config, socketLibrary, deviceLibrary) {
	var db = databases.getConnection("gps", config.gps);
	const ClientMessage = db.model("clientmessages", ClientMessageSchema);
	var watcher = new Watcher(config.database, 'gps.clientmessages',{
		onCreate: function(data){
			async.waterfall([
				function(next){
					socketLibrary.getConnectedDevices(next)
				},
				function(connectedDevices,next){
					connectedImeis = connectedDevices.map(function(device){ return device.imei;});
					ClientMessage.find({sent:false, imei:{ $in: connectedImeis}}).limit(20).sort({createdDate:1}).exec(function(err,messages){
						next(err, connectedDevices, messages);
					});
				},
				function(connectedDevices, messages, next){
					var list = {};
					for(var i = 0; i < messages.length; i ++){
						var message = messages[i];
						if(!(message.imei in list)){
							list[message.imei] =  [];
						}						
						list[message.imei].push(message);
					}
					for(var imei in list)
					{
						device = connectedDevices.find(function(device){
							return device.imei === imei;
						});
						if(device != null){
							socketLibrary.getConnectedDevice(device.imei, function(err, connection){
								deviceLibrary.sendMessagesToClient(connection.socket, list[imei]);
							})
						}
					}
				},
			],function(err,result){

			})
		}
	})
}