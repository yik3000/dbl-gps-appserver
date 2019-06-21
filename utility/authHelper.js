module.exports = {
 getIndentity:function(req){
 	if(!req.decoded)
 		return null;
 	var decoded = req.decoded;
 	return decoded;
 },
 analyzeAllBut:function(method,req,res,next)
 {
 	if(req.method == method)
 	{
 		next();
 	}
 	else
 	{
			  var jwt = require('jsonwebtoken');	
			  var config = require('../config.js');
			  // check header or url parameters or post parameters for token
			  var token = req.body.token || req.query.token || req.headers['x-access-token'];
			  if(token){
				 jwt.verify(token, config.secret, function(err,decoded){
				 	if(err){
				 		return res.json({success:false, message:"failed to authenticate token"});
				 	} 
				 	else
				 	{
				 		req.decoded = decoded;
				 		next();
				 	}
				 })		  	
			  }
			  else
			  {
			  	 return res.status(403).send({
			  	 	success:false,
			  	 	message:"no token"
			  	 })
			  }
 	}	
 },
 analyzeAllButGet:function(req,res,next){
 	module.exports.analyzeAllBut('GET',req,res,next);
 },
 analyzeAllButPost:function(req,res,next){
 	module.exports.analyzeAllBut('POST',req,res,next); 	
 },
 analyze:function(req,res,next){
			  var jwt = require('jsonwebtoken');	
			  var config = require('../config.js');

			  // check header or url parameters or post parameters for token
			  var token = req.body.token || req.query.token || req.headers['x-access-token'];
			  if(token){
				 jwt.verify(token, config.secret, function(err,decoded){
				 	if(err){
				 		return res.json({success:false, message:"failed to authenticate:" + err});
				 	} 
				 	else
				 	{
				 		req.decoded = decoded;
				 		next();
				 	}
				 })		  	
			  }
			  else
			  {
			  	 return res.status(403).send({
			  	 	success:false,
			  	 	message:"no token"
			  	 })
			  }
	}	
}