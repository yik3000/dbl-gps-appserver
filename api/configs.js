const express = require('express');
const crudTool = require('../utility/crudtools.js');
const FileConfigs = require('../config.js');
const ConfigSchema = require('../model/config.js');
const KeyValueSchema = require('../model/keyValue.js');
const databases = require('../db.js');
const verificaitonHelper = require('../utility/verificationHelper.js');


module.exports = function(app){
	var configRoutes = express.Router();
	var db = databases.getConnection("gps",app.get("application"));
	var Configs =	db.model("config", ConfigSchema);
	var KeyValues = db.model('keyvalue', KeyValueSchema);

	configRoutes.get('',verificaitonHelper.verify,function(req,res){
		var appId = FileConfigs.appId
		Configs.findOne({_id:appId}).lean().exec(function(err,configs){
			crudTool.respond(res,err, configs);
		});
	})

	configRoutes.get('/keyvalue/:groupName', verificaitonHelper.verify, function(req,res){
		var appId = FileConfigs.appId;
		KeyValues.find({groupName: req.params.groupName}).sort({sortValue:1}).lean().exec(function(err,result){
			if(err) return crudTool.failed(res, "E06", err);
			crudTool.success(res, result);
		})
	})



	app.use('/config',configRoutes);
}