db = connect("localhost:27030/gps");
db.customers.updateMany({},{ $set: {vipGrade:'No Discount', discount:1, credit:0} });