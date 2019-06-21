db = connect("localhost:27030/admin");
db.createUser( { 
		  user: "manager",
          pwd: "nothing",
          roles: [ "userAdminAnyDatabase",
                   "dbAdminAnyDatabase",
                   "readWriteAnyDatabase",
                   "clusterAdmin"
] } )