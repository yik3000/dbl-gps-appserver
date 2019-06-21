var mongoose = require('mongoose');
var connections = {};
exports.getConnection = function(dbName, applicationSettings) {
    if(connections[dbName]) {
        //database connection already exist. Return connection object
        return connections[dbName];
    } else {
    	if(dbName == 'gps'){
	        connections['gps'] = mongoose.createConnection(applicationSettings.gpsDatabase,{ server: { poolSize: applicationSettings.gpsDBPool }});
	        return connections['gps'];
    	}
    	else if(dbName == 'crm'){
	        connections['crm'] = mongoose.createConnection(applicationSettings.crmDatabase,{ server: { poolSize: applicationSettings.crmDatabase }});
	        return connections['crm'];
    	}
    }       
}
