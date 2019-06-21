var express = require('express');
var tokenTool = require('../utility/authHelper.js');
const async = require('async');
const crudTool = require('../utility/crudtools.js');
const bodyParser = require('body-parser');
//const UserSchema = require('../model/user.js');
const verificationHelper = require('../utility/verificationHelper.js');
const VcodeSchema = require('../model/vcode.js'); 
const databases = require('../db.js');
const shortId = require('shortid');

module.exports = function(app){
	var vCodeRoutes = express.Router();
	vCodeRoutes.use(bodyParser.json());
	var db = databases.getConnection("gps",app.get("application"));
	var Vcodes = db.model("vcode", VcodeSchema);
		
	vCodeRoutes.post('/', verificationHelper.verify, function(req,res){
		if(!crudTool.ensure(req,res,['mobile','type'])){return;}
		code = shortId.generate().toLowerCase();
		var vcode = Vcodes({
			code: code,
			phoneNumber: req.body.mobile,
			type: req.body.type //type 0 register, type 1 password reset, type 2: change phone number
		})
		vcode.save(function(err,result){
			if(err){
				res.json({status:1,errorNo: 'W002', errorMsg : err});
			}	
			else{
				res.json({status:0, testOnlyCode: result.code});
			}
		})
	})
	app.use('/vcode',vCodeRoutes);
}