db = connect("localhost:27030/local");
db.system.replset.remove({})
db.replset.election.remove({})
db.oplog.rs.remove({})
