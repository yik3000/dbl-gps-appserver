db = connect("localhost:27030/local");

rs.initiate({
 "_id" : "rs0", 
 "version" : 1, 
 "protocolVersion" : NumberLong(1), 
 "members" : [ 
 	{ "_id" : 0, "host" : "127.0.0.1:27030", "arbiterOnly" : false, "buildIndexes" : true, "hidden" : false, "priority" : 1, "tags" : {  }, "slaveDelay" : NumberLong(0), "votes" : 1 } 
 ], 
 "settings" : { 
 	"chainingAllowed" : true, 
 	"heartbeatIntervalMillis" : 3000, 
 	"heartbeatTimeoutSecs" : 10, 
 	"electionTimeoutMillis" : 10000, 
 	"getLastErrorModes" : {  }, 
 	"getLastErrorDefaults" : { "w" : 1, "wtimeout" : 0 } } 
})

/*
cursor = db.system.replset.find({});
while(cursor.hasNext())
{
	printjson(cursor.next());
}
*/
//db = conn.getDB("local");
//{ "_id" : "rs0", "version" : 1, "protocolVersion" : NumberLong(1), "members" : [ { "_id" : 0, "host" : "Ivs-MacBook-Pro.lan:27017", "arbiterOnly" : false, "buildIndexes" : true, "hidden" : false, "priority" : 1, "tags" : {  }, "slaveDelay" : NumberLong(0), "votes" : 1 } ], "settings" : { "chainingAllowed" : true, "heartbeatIntervalMillis" : 2000, "heartbeatTimeoutSecs" : 10, "electionTimeoutMillis" : 10000, "getLastErrorModes" : {  }, "getLastErrorDefaults" : { "w" : 1, "wtimeout" : 0 } } }
