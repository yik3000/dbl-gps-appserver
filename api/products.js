var express = require('express');
const bodyParser = require('body-parser');
var crudTool = require('../utility/crudtools.js');
var tokenTool = require('../utility/authtoken.js');
const ProductsSchema = require('../model/product.js');
const databases = require('../db.js');
var async = require('async')

module.exports = function(app){
	var productRoutes = express.Router();
	productRoutes.use(tokenTool.analyze);
	productRoutes.use(bodyParser.json());
	
	var db = databases.getConnection("gps",app.get("application"));
	var Products = db.model("products", ProductsSchema);


-	productRoutes.get('/',function(req,res){
		identity = tokenTool.getIndentity(req);
		var id = identity._id;
		if(!identity.staff)
		{
			crudTool.failed(res,"invalid roles");
			return;
		}
		Products.find({}).then(products => {
			crudTool.success(res, products)}
		).catch(err => crudTool.failed(res, err))
	})
	productRoutes.get('/:id', function(req,res){
		identity = tokenTool.getIndentity(req);
		//var id = identity._id;
		Products.findOne({_id:req.params.id}).lean().exec(function(err,product){
			crudTool.respond(res,err,product);
		})
	})
		

	app.use('/products',productRoutes);
}