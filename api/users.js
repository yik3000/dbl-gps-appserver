var express = require('express');
var crudTool = require('../utility/crudtools.js');
var tokenTool = require('../utility/authtoken.js');
const bodyParser = require('body-parser');
const UserSchema = require('../model/user.js');
const CustomerSchema = require('../model/customer.js');
const databases = require('../db.js');

module.exports = function(app){
	var userRoutes = express.Router();
	userRoutes.use(tokenTool.analyze)
	userRoutes.use(bodyParser.json());
	var db = databases.getConnection("gps",app.get("application"));
	var Users =	db.model("users", UserSchema);
	var Customers =	db.model("customers", CustomerSchema);

	userRoutes.get('/',function(req,res){
		identity = tokenTool.getIndentity(req);
		var id = identity._id;
		if(identity.staff)
		{
			Users.findOne({_id: id}).lean().exec(function(err,user){
				return crudTool.respond(res,err,{
					_id: user._id,
					createdDate: user.createdDate,
					username: user.username,
					password: user.password,
					companyId: user.companyId,
					roles: user.roles,
					staff: true
				});
			})			
		}else
		{
			Customers.findOne({_id: id}).lean().exec(function(err,user){
				return crudTool.respond(res,err,{
					nickname: user.nickname,
					_id: user._id,
					createdDate: user.createdDate,
					username: user.username,
					password: user.password,
					associatedDevices: user.associatedDevices,
				});
			})
		}
	})
	app.use('/users',userRoutes);
}