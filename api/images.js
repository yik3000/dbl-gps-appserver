var express = require('express');
var tokenTool = require('../utility/authHelper.js');
const crudTool = require('../utility/crudtools.js');
const fs = require('fs');

module.exports = function(app){
	var imageRoutes = express.Router();
	//imageRoutes.use(tokenTool.analyze)
	imageRoutes.get('/avatar/:imageName', function(req,res){
		fs.readFile('./uploads/profiles/' + req.params.imageName,  function(err,data){
			if(err){
				console.log(err);
			}
			res.end(data, 'binary');
		})
	});

	imageRoutes.get('/order/:imageName', function(req,res){
		fs.readFile('./uploads/orders/' + req.params.imageName,  function(err,data){
			if(err){
				console.log(err);
			}
			res.end(data, 'binary');
		})
	})


	imageRoutes.get('/product/:imageName', function(req,res){
		fs.readFile('./uploads/products/' + req.params.imageName,  function(err,data){
			if(err){
				fs.readFile('./uploads/products/default.jpg',  function(err,defaultData){
					if(err)console.log(err);
					return res.end(defaultData, 'binary');			
				});
			}
			else{
				return res.end(data, 'binary');
			}
		})
	})

	app.use('/images',imageRoutes);
}