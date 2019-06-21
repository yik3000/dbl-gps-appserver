const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');

const crudTool = require('../utility/crudtools.js');
const tokenTool = require('../utility/authHelper.js');

const OrdersSchema = require('../model/serviceOrder.js');
const CustomerSchema = require('../model/customer.js');
const UserSchema = require('../model/user.js');
const databases = require('../db.js');

module.exports = function(app){
	var uploadRoutes = express.Router();
	uploadRoutes.use(tokenTool.analyzeAllButGet);
	var db = databases.getConnection("gps",app.get("application"));
	var Customers =	db.model("customers", CustomerSchema);
	var ServiceOrders = db.model("serviceOrder", OrdersSchema);
	var Users =	db.model("users", UserSchema);

	var storage =   multer.diskStorage({
	  destination: function (req, file, callback) {
	    callback(null, './uploads/profiles');
	  },
	  filename: function (req, file, callback) {
		var identity = tokenTool.getIndentity(req);
//	    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//	    callback(null, identity._id +  path.extname(file.originalname));
	    callback(null, identity._id);
	  }
	});

	var orderImageStorage =   multer.diskStorage({
	  destination: function (req, file, callback) {
	    callback(null, './uploads/orders');
	  },
	  filename: function (req, file, callback) {
		var identity = tokenTool.getIndentity(req);
		if(identity.staff == false) return callback("not a staff");
		//if(req.body.orderId == null) return callback("dont have orderId")
		/*
		ServiceOrders.findOne({_id: req.body.orderId}, function(err, order){
			if(order == null){
				return callback("order not found");
			}
			else{
				callback(null, req.body.orderId +  '-' + Date.now() + path.extname(file.originalname));
			}
		})
*/
//		callback(null, Date.now() + path.extname(file.originalname));
		callback(null, identity._id + '-' + Date.now());
	  }
	});

	var profileUpload = multer({storage:storage}).single('photo');
	var orderUpload = multer({storage:orderImageStorage}).single('photo');

	uploadRoutes.post('/order', bodyParser.raw(), orderUpload,  function(req,res,next){
		identity = tokenTool.getIndentity(req);
		if(identity.staff == true){
			return crudTool.success(res, { file: req.file.filename});
		}
		else{
			return crudTool.failed(res, "W02", "not a staff")
		}
	})

	uploadRoutes.post('/profile', bodyParser.raw(), profileUpload, function(req,res,next){
		identity = tokenTool.getIndentity(req);				
		if(identity.staff == true)
		{
			Users.findOneAndUpdate({_id: identity._id}, {
				imageUrl: req.file.filename,
			}, function(err,result){
				if(err) {
					return crudTool.failed(res,"E06", err);
				}
				crudTool.success(res,{file: 'images/avatar/' +  req.file.filename });
			})	
		}
		else{
			Customers.findOneAndUpdate({_id: identity._id}, {
				imageUrl: req.file.filename,
			}, function(err,result){
				if(err) {
					return crudTool.failed(res,"E06", err);
				}
				crudTool.success(res,{});				
			})
		}
	});



	app.use('/uploads',uploadRoutes)
}
