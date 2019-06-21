var configs = require('../config.js');
const SHA1 = require('./sha.js');
const async = require('async');

function verifySignature2(signature, appId, shared_secret){
 	var splited = signature.split('.')	
 	var hashValue = splited[0];
 	var timeStamp = splited[1];
 	var stringToSign = appId + 'UZ' + shared_secret + 'UZ' + timeStamp;
	var sig = SHA1(stringToSign);

	return hashValue === sig;
 }
function verifyTime2(signature){
 	var splited = signature.split('.')	
 	var timeStamp = splited[1];
 	if(Math.round(new Date().getTime()/1000) - timeStamp > 30)
 	{
 		return false;
 	}
 	else
 	{
 		return true;
 	}
 }
function parseQuery(query) {
	var query_map = {};
	query.split('&').map(function(el){
		var split_at = el.indexOf('=')
		query_map[el.slice(0, split_at)] = el.slice(split_at+1)
	});
	return query_map;
 }

module.exports = {
 verify:function(request, response, next)
 { 	
 	async.waterfall([
 		function(next){
		 	if(request.headers == null || request.headers.signature == null){
		 		next('missing signature');
		 	}
		 	else next(null);
 		},
 		function(next){
 			var authenticateResult = verifySignature2(request.headers.signature, configs.appId, configs.appsecret); 
			if(authenticateResult == false) next('failed to verify signature');
			else next(null); 			
 		},
 		function(next){
 			if(verifyTime2(request.headers.signature) == false) next('failed to verify time');
 			else next(null);
 		}
 	],function(err,result){
 		if(err){
			return response.status(403).send({
			status: 1,
			errorNo: 'W01',
			errorMsg: err}); 			
 		}
 		return next();
 	}) 
 }
}