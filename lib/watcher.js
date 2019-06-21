var MongoOplog = require('mongo-oplog');
module.exports = function(serverUri, namespace, callbacks){
	var oplog = MongoOplog(serverUri + 'local', { 
		ns: namespace
	})
	oplog.on('insert', function (doc) {
	  	if(callbacks.onCreate)
	  	{
		  	callbacks.onCreate(doc);
	  	}
	});
	oplog.on('update', function (doc) {
		if(callbacks.onUpdate)
		{
			callbacks.onUpdate(doc);
		}
	});

	oplog.on('error', function (error) {
	  console.log(error);
	});

	oplog.on('end', function () {
	  console.log('Stream ended');
	});


	oplog.stop(function () {
	  console.log('server stopped');
	});

	oplog.tail(function(){
		console.log("sycning engine is now watching: " + namespace)});
}
