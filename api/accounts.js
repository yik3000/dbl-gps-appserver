const express = require('express');
const bodyParser = require('body-parser');
const crudTool = require('../utility/crudtools.js');
const CustomerSchema = require('../model/customer.js');
const UserSchema = require('../model/user.js');
const jwt = require('jsonwebtoken');
const databases = require('../db.js');
const ConfigSchema = require('../model/config.js');
const VcodeSchema = require('../model/vcode.js');
//const configs = require('../config.js');
const verificationHelper = require('../utility/verificationHelper.js');
const authTokenHelper = require('../utility/authHelper.js');
const async = require('async');

var tokenValidFor = 60 * 60 * 24 * 7; // expires in 7 * 24 hours

module.exports = function(app, configs){
	var registerRoutes = express.Router();
	registerRoutes.use(bodyParser.json());
	var db = databases.getConnection("gps",app.get("application"));
	var Customers =	db.model("customer", CustomerSchema);
	var Vcodes = db.model('vcode', VcodeSchema);
	var Configs = db.model("config", ConfigSchema);
	var Users = db.model("user", UserSchema);

	

	registerRoutes.post('/register', verificationHelper.verify, function(req,res, next){
		if(crudTool.ensure(req,res,['username','password','vcode','acceptTnc']) == false){
			return;
		}
		async.waterfall([
			function(next){
				Vcodes.findOne({code:req.body.vcode}).exec(next)
			},
			function(vcode, next){
				if(!vcode){
					next("verification code")
				}
				else
				{
					if(vcode.verified == false && vcode.type == 0){
						var timeDiff = Math.abs(new Date() - vcode.timestamp);
						var diffMinutes = Math.ceil(timeDiff / (1000 * 60)); 
						if(diffMinutes > 5){
							next('verification over due')
						}
						else{
							next(null,vcode)	
						}
					 }
					else{
						next("verification code invalid")
					}
				}
			},
			function(vcode, next){
				vcode.verified = true;
				vcode.save(function(err,result){ next(err,vcode)})
			},
			function(vcode, next){
				//search if vcode customer already exist
				Customers.findOne({username: vcode.phoneNumber}, function(err, customer){
					//if it exist
					if(err) return next(err);
					if(customer){
						//if customer already agree to TnC which means he has been register before
						if(customer.acceptTnC == true){
							return next("customer already exist")
						}
						next(null, vcode, customer)
					}
					else{
						next(null, vcode, null)
					}
				})
			},
			function(vcode, customer, next){
				if(customer!=null){
					//customer already exist
					customer.associatedDevices = [];
					customer.password = req.body.password;
					customer.nickname = req.body.username;
					customer.acceptTnC = req.body.acceptTnc;
				}
				else{
					var customer = new Customers({
						associatedDevices: [],
						password: req.body.password,
						username: vcode.phoneNumber,
						nickname: req.body.username,
						acceptTnC: req.body.acceptTnc,
					})					
				}
				customer.save(function(err,result){
					next(err,result);
				})
			}
		], function(err,newUser){
			if(err){
				if(err == "verification code"){
					return crudTool.failed(res,"W003", "no such verification code")
				}
				else if(err == "verification over due"){
					return crudTool.failed(res,"W004", "verification took too long")
				}
				else if(err == "verification code invalid"){
					return crudTool.failed(res,"W005", "invalid verification code");
				}
				else if(err == "customer already exist"){
					return crudTool.failed(res, "W007", "customer already exist ");
				}
				else{
					crudTool.failed(res, "W006", err);
					return;
				}
			}
			if(newUser)
			{
				var signedData = {
						_id: newUser._id,
						username: newUser.username,
						staff:false
				};
				var token = jwt.sign(signedData, app.get('superSecret'), {
				          expiresIn: tokenValidFor,
				        });
				res.json({
					status:0,
					body:{
						userId: newUser._id,
						accesstoken: token
					},
				});
				return;
			}
		})
	})


	registerRoutes.post('/autologin', //authHelper.verify, 
		function(req,res){
		if(!req.headers.hasOwnProperty("auth-appid") || !req.headers.hasOwnProperty("auth-appkey") || !req.headers.hasOwnProperty("app-token")){
			return crudTool.failed(res,'W001',"invalid header")
		}
		if(crudTool.ensure(req,res,["username"]) == false){
			return;
		}
		var token = req.headers["app-token"];
		jwt.verify(token, configs.secret, function(err,decoded){
			if(err){
				return res.json({status: 1, errorMsg:err});
			} 
		 	else{
		 		if(decoded.username == req.body.username)
		 		{
		 			//success
	 				var renewToken = jwt.sign({
	 					username: decoded.username,
	 					_id: decoded._id,
	 					staff:decoded.staff
	 				}, configs.secret, {
						          expiresIn: tokenValidFor,
						        });
					
					res.json({
							status:0,
							body:{
								userId: decoded._id,
								accesstoken: renewToken
							},
					});
		 		}
		 		else{
		 			return res.json({status:1, errorMsg:'invalid account data'})
		 		}
		 	}
		})


	})


	registerRoutes.post('/login', verificationHelper.verify, function(req,res){
		if(crudTool.ensure(req,res,["username","password","type"]) == false){
			return;
		}
		Configs.findOne({_id:configs.appId}).exec(function(err,config){
			if(!err && config)
			{
				if(config.isMaintain == true)
				{
					res.json({
						status:1,
						error: [{erorrNo:'E001', errorMsg: '系統維護'}],
					});
					return;
				}
			}
		})
		if(req.body.username =='' || req.body.password =='')
		{
			res.json({
				status:1,
				error: [{erorrNo:'W001', errorMsg: '憑證錯誤'}],
			});
			return;
		}
		if(req.body.type == 1)
		{
				Users.findOne({	
						username:req.body.username,
						password:req.body.password, 						
					},function(err,data){
						if(err)
						{
							res.json({
								status:1,
								error: [{erorrNo:'E002', errorMsg: err}],
							});
							return;
						}
						else
						{	
							if(data == null)
							{
								res.json({
									status:1,
									error: [{erorrNo:'W001', errorMsg: '憑證錯誤'}],
								});								
								return;
							}
							var signedData = {
								_id: data._id,
								username: data.username,
								companyId: data.companyId,
								staff: true,
							};
							var token = jwt.sign(signedData, app.get('superSecret'), {
							          expiresIn: tokenValidFor,
							        });
							res.json({
								status:0,
								body:{
									userId: data._id,
									accesstoken: token
								},
							});
							return;
						}
				});
		}
		else if(req.body.type == 0)
		{
			Customers.findOne({	
						username:req.body.username,
						password:req.body.password,
						acceptTnC: true
					},function(err,data){
						if(err)
						{
							res.json({
								status:1,
								error: [{erorrNo:'E002', errorMsg: err}],
							});			
							return;
						}
						else
						{	
							if(data == null)
							{
								res.json({
									status:1,
									error: [{erorrNo:'W001', errorMsg: '憑證錯誤'}],
								});			
								return;
							}
							var signedData = {
								_id: data._id,
								username: data.username,
								staff: false,
							};
							var token = jwt.sign(signedData, app.get('superSecret'), {
								          expiresIn: tokenValidFor,
							        });
							res.json({
								status:0,
								body:{
									userId: data._id,
									accesstoken: token
								},
							});
							return;
						}
			});
		}
		else
		{
			res.json({
				status:1,
				error: [{erorrNo:'E002', errorMsg: 'login type not presented'}],
			});						
		}
	})
	
	registerRoutes.put('/', authTokenHelper.analyze, function(req, res){
		identity = authTokenHelper.getIndentity(req);
		if(identity.staff){
			Users.findOneAndUpdate({_id: identity._id}, {
				nickname: req.body.name,				
				lastUpdateBy: 'user',
			},function(err,result){
				if(err) return crudTool.failed(res, "W006", err);
				return crudTool.success(res);
			})
		}
		else{
			Customers.findOneAndUpdate({_id: identity._id}, {
				nickname: req.body.name, 
				address: req.body.address, 
				sex: req.body.sex,
				smsNotificationEnabled: req.body.smsNotificationEnabled
			}, function(err, result){
				if(err) return crudTool.failed(res, "W006", err);
				return crudTool.success(res);
			})
		}				
	})


	registerRoutes.put("/:customerId", authTokenHelper.analyze, function(req, res){
		identity = authTokenHelper.getIndentity(req);
		if(!identity.staff) return crudTool.failed(res, "W002", "staff only function");
		Customers.findOneAndUpdate({_id: req.params.customerId}, {
				nickname: req.body.name, 
				address: req.body.address, 
				sex: req.body.sex,
				smsNotificationEnabled: req.body.smsNotificationEnabled
			}, function(err, result){
				if(err) return crudTool.failed(res, "W006", err);
				return crudTool.success(res);
			})
	})



	registerRoutes.get('/:customerId', authTokenHelper.analyze, function(req, res){
		identity = authTokenHelper.getIndentity(req);
		if(!identity.staff) return crudTool.failed(res, "W002", "staff only function");
		Customers.findOne({_id: req.params.customerId}).lean().exec(function(err,customer){
			if(err) return crudTool.failed(res, "W006", err);
			return crudTool.success(res,{
				_id: customer._id,
				name: customer.nickname,
				createdDate: customer.createdDate,
				mobile: customer.username,
				password: customer.password,
				address: customer.address,
				sex: customer.sex,
			});
		})
	})

	registerRoutes.get('/', authTokenHelper.analyze, function(req,res){
		identity = authTokenHelper.getIndentity(req);
		if(identity.staff)
		{
			Users.findOne({_id: identity._id}).lean().exec(function(err,user){
				return crudTool.respond(res,err,{
					_id: user._id,
					name: user.nickname,
					createdDate: user.createdDate,
					mobile: user.username,
					companyId: user.companyId,
					roles: user.roles,
					imageUrl: 'images/avatar/' + user.imageUrl,
					passwordReset: user.passwordReset,
					staff: true
				});
			})			
		}
		else{
			Customers.findOne({_id: identity._id}).lean().exec(function(err,customer){
				return crudTool.respond(res,err,{
					_id: customer._id,
					name: customer.nickname,
					createdDate: customer.createdDate,
					mobile: customer.username,
					address: customer.address,
					sex: customer.sex,
					smsNotificationEnabled: customer.smsNotificationEnabled,
					imageUrl: 'images/avatar/' + customer.imageUrl,
					staff: false,
					//associatedDevices: customer.associatedDevices,
				});
			})
		}		
	})

	registerRoutes.post('/changepwd', authTokenHelper.analyze,function(req,res){
		var identity = authTokenHelper.getIndentity(req);
		if(crudTool.ensure(req,res,["username","oldPwd","newPwd"]) ==false){ return;}
		if(req.body.oldPwd == req.body.newPwd) { return res.json({status:1, errorNo:"W004", errorMsg:'old and new password are the same'})}
		if(req.body.username == identity.username){
			if(identity.staff == true)
			{
				Users.findOne({_id:identity._id}).exec(function(err,user){
					if(user){
						if(user.password != req.body.oldPwd){
							return res.json({status:1, errorNo: 'W003', errorMsg:'old passworod is not the same' })						
						}
						user.password = req.body.newPwd;
						user.lastUpdateBy = "user";
						user.passwordReset = false;
						user.save(function(err,updateUser){
							return res.json({stauts:0})
						})
					}
				})
			}
			else
			{
				Customers.findOne({_id:identity._id}).exec(function(err,customer){
					if(customer){
						if(customer.password != req.body.oldPwd){
							return res.json({status:1, errorNo: 'W003', errorMsg:'old passworod is not the same' })						
						}
						customer.password = req.body.newPwd;
						customer.save(function(err,updateUser){
							return res.json({stauts:0})
						})
					}
				})
	
			}
		}
		else{
			return res.json({status:1, errorNo: 'W002', errorMsg:'token shows a different account name' })
		}
	})

	registerRoutes.post('/changemobile', authTokenHelper.analyze, function(req, res){
		if(crudTool.ensure(req,res,["oldmobile","newmobile", 'vcode']) == false){return;}
		var identity = authTokenHelper.getIndentity(req);
		async.waterfall([
			function(next){
				if(req.body.oldmobile == req.body.newmobile) return next("mobile number did not change")	
				Customers.findOne({_id:identity._id}).exec(next);
			},
			function(customer, next){				
				if(customer == null) return next("customer not found");
				if(customer.username != req.body.oldmobile) return next("old mobile does not match");
				Vcodes.findOne({code:req.body.vcode}).exec(function(err, vcodeResult){
					next(err, customer,vcodeResult);
				})
			},
			function(customer, vcode, next){
				if(vcode == null) return next("invalid verification code");
				if(vcode.phoneNumber != req.body.newmobile){
					return next('verification code is from a different number')
				}
				if(vcode.verified == true){
					return next('verification code is used');
				}
				var timeDiff = Math.abs(new Date() - vcode.timestamp);
				var diffMinutes = Math.ceil(timeDiff / (1000 * 60)); 
				if(diffMinutes > 5){
					return next('verification over due')
				}
				if(vcode.type != 2){
					return next('wrong verification type')
				}

				next(null,customer,vcode)
			},
			function(customer,vcode, next){
				vcode.verified = true;
				vcode.save(function(err,result){next(err, customer, result)});
			},
			function(customer,vcode, next){
				customer.username = vcode.phoneNumber;
				customer.save(function(err,result){ next(err, result)});
			}
		],function(err,result){
			if(err){
				if(err == "customer not found") return crudTool.failed(res,"W003", err);
				if(err == "old mobile does not match") return crudTool.failed(res, "W005", err);
				if(err == "mobile number dit not change") return crudTool.failed(res, "W005", err);

				if(err == "invalid verification code") return crudTool.failed(res,"W004", err);
				if(err == "verification code is from a different number") return crudTool.failed(res,"W004", err);
				if(err == "verification code is used") return crudTool.failed(res,"W004", err);
				if(err == "wrong verification type") return crudTool.failed(res,"W004", err);
				if(err == "verification over due") return crudTool.failed(res,"W004", err);
				
				return crudTool.failed(res, "E006", err);
			}
			return crudTool.success(res, {status: 0});
		})
	})


	registerRoutes.post('/resetpwd', verificationHelper.verify ,function(req,res){
		if(crudTool.ensure(req,res,["username","vcode", "resetPwd1", "resetPwd2"]) == false){return;}
		if(req.body["resetPwd1"] != req.body["resetPwd2"]){
			return res.json({status:1, errorNo: 'W002', errorMsg:'password not the same'})
		}
		async.waterfall([
			function(next){
				Vcodes.findOne({code:req.body.vcode}).exec(next)
			},
			function(vcode, next){
				if(!vcode){
					return next("cant find verification code")
				}
				else
				{
					if(vcode.phoneNumber != req.body.username)
					{
						return next('verifying account is different then submit account')
					}

					if(vcode.verified == false && vcode.type == 1){
//					if(vcode.verified == true && vcode.type == 1){
						var timeDiff = Math.abs(new Date() - vcode.timestamp);
						var diffMinutes = Math.ceil(timeDiff / (1000 * 60)); 
						if(diffMinutes > 5){
							return next('verification over due')
						}
						else{
							return next(null,vcode)	
						}
					 }
					else{
						return next("verification code invalid")
					}
				}
			},
			function(vcode, next){
				vcode.verified = true;
				vcode.save(function(err,result){ next(err,vcode)})
			},
			function(vcode, next){
				Customers.findOne({username: req.body.username}).exec(function(err,customer){
					if(err){ next(err); }
					if(!customer){ next("user not exist"); }
					else
					{
						customer.password = req.body.resetPwd1;
						customer.save(function(err,customer){
							next(null,customer);
						});						
					}
				});				
			}],function(err, result){
				if(err){
					if(err == "cant find verification code") return crudTool.failed(res,"W003", "no such verification code");
					if(err == "verification code invalid") return crudTool.failed(res, "W005", "invalid verification code");
					if(err == "verification over due") return crudTool.failed(res,"W004", "verification took too long");
					if(err == "user not exist") return crudTool.failed(res,"W006", "user do not exist");
					if(err == 'verifying account is different then submit account') return crudTool.failed(res, "W007", "verifying account is different then submit account")
					return crudTool.failed(res, "W008", err);
				}
				return crudTool.success(res, {status: 0});
			})
	})
	app.use('/account',registerRoutes);
}