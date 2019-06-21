const SignalTowerSchema = require('../model/signalTower.js');
const Client = require('node-rest-client').Client;
const cellTri = require('cell-tower-triangulation');
const databases = require('../db.js');
const coordtransform=require('coordtransform');



/**********   Cell Tower Method   *************/
const webServiceLocation = "http://api.cellocation.com/cell/";
function get(url){
        return new Promise((resolve,reject) => {
            var client = new Client();
             client.get(url,function(data){
                  resolve(data);
             }).on('error',function(err){
                  reject(err);
             });
        })   
}
function queryWebService(countryCode, carrierCode, lac, cellId){
	return new Promise((resolve, reject) => {
		var url = webServiceLocation + "?mcc="+countryCode+"&mnc="+carrierCode+"&lac="+lac+"&ci="+cellId+"&output=json"
		get(url)
		.then(function(response){
			if(response.errcode == 0){
				resolve(response)
			}
			else{
				reject(response)
			}
		})			
	})
}

function triangulate(signals)
{
	var circles = signals.map(function(signal){
		return ({latitude:  signal.lat, longitude: signal.lon, signal: signal.strength * -1});
	});
	var position = cellTri(circles);
	return position;
}


function getCellTowerCoordinate(signalTower, callback){
	SignalTower.findOne({
				country: signalTower.countryCode, 
				carrier: signalTower.carrierCode, 
				lac: signalTower.lac, 
				cellId: signalTower.cellId
				},
		function(err,res){
			if(err){callback(err)}
			if(!err && res == null){
				queryWebService(signalTower.countryCode,signalTower.carrierCode, signalTower.lac, signalTower.cellId)
				.then(function(response){
					var newSignalTower = new SignalTower({
							country: signalTower.countryCode, 
							carrier: signalTower.carrierCode, 
							lac: signalTower.lac, 
							cellId: signalTower.cellId,
							coordinate:[response.lon,response.lat],
							radius: parseInt(response.radius),
							label: response.address 						
					});
					newSignalTower.save(function(err,response){
						callback(err,response);
					})
				})
			}
			else{
				callback(null,res);
			}
		}
	);
}

function getLocationByTower(towerSignals, callback)
{
	var requests = towerSignals.map(function(towerSignal){		
		var task = new Promise((resolve,reject) => {
			getCellTowerCoordinate(towerSignal, function(err, tower){
				if(err) { reject(err)}
				else if(!err && tower != null){
					towerSignal.loc = {lat:tower.coordinate[1], lon:tower.coordinate[0]}
					towerSignal.radius = tower.radius;
					resolve(towerSignal);
				}
			})
		})
		return task;
	})
	Promise.all(requests).then(function(data){
		var listOfCords = data.map(function(signal){
				return {lat:signal.loc.lat,lon:signal.loc.lon,strength:signal.strength, radius:signal.radius}
		});

		var position = triangulate(listOfCords); 
		//convert from WGS84 coordinate system to BD09 
		var convertedCoord =coordtransform.wgs84togcj02(position.longitude, position.latitude);
		convertedCoord = coordtransform.gcj02tobd09(convertedCoord[0], convertedCoord[1]);

		callback(null, {lon: convertedCoord[0], lat: convertedCoord[1]})
    }).catch(function(err){
    	callback(err)
    });
}	
/********** END of  Cell Tower Method   *************/



/********** GPS Method   *************/
function getLocationByGps(str)
{		
	var timeSlot = str.substr(0,6);
	var latitudeStr = str.substr(6,8);
	var longitudeStr = str.substr(14,9);

	var Fvalue = str.substr(23,1);
	var speed = str.substr(24,2)
	var orientation = str.substr(26,2)
	var dd = str.substr(28,2)
	var mm = str.substr(30,2)
	var yy = str.substr(32,2)

	var latitude = convertFromStrToNumber(latitudeStr,'lat');
	var longitude = convertFromStrToNumber(longitudeStr,'long');

	switch(Fvalue)
	{
		case "0":
		case "1":
			latitude.orientation = 'S'
			longitude.orientation = 'W'
			break;
		case "2":
		case "3":
			latitude.orientation = 'N'
			longitude.orientation = 'W'
			break;
		case "4":
		case "5":
			latitude.orientation = 'S'
			longitude.orientation = 'E'
			break;
		case "6":
		case "7":
		case "F":
			latitude.orientation = 'N'
			longitude.orientation = 'E'
			break;
	}

	var latitudeDD = convertFromDMStoDD(latitude.degree, latitude.minute, latitude.second, latitude.orientation);
	var longitudeDD = convertFromDMStoDD(longitude.degree, longitude.minute, longitude.second, longitude.orientation);
	//convert from WGS84 coordinate system to BD09 
	var convertedCoord =coordtransform.wgs84togcj02(longitudeDD, latitudeDD);
	convertedCoord = coordtransform.gcj02tobd09(convertedCoord[0], convertedCoord[1]);

	return {
		lat: convertedCoord[1],
		lon: convertedCoord[0],
		speed: speed,
		orientation: orientation			
	}
}

function convertFromDMStoDD(degree, minute, seconds, orientation)
{
	var reading = degree + minute / 60 + seconds / 3600;
	var modifier = 1;
	if(orientation == "S" || orientation == "W"){
		modifier = -1;
	}
	return reading * modifier;
}
function convertFromStrToNumber(str,latOrLong)
{
	var result = {}
	if(latOrLong == 'lat'){
		result = {
			degree: parseInt(str.substr(0,2)),
			minute: parseInt(str.substr(2,2)) + parseInt(str.substr(4,4)) * 0.0001,
			second: 0,
			orientation: ''
		}	
	}
	else if(latOrLong == 'long')
	{
		result = {
			degree: parseInt(str.substr(0,3)),
			minute: parseInt(str.substr(3,2)) + parseInt(str.substr(5,4)) * 0.0001,
			second: 0,
			orientation: ''
		}				
	}
	return result;
}



module.exports = function LocationLibrary(applicationProfile) {
	var db = databases.getConnection("gps", applicationProfile);
	SignalTower = db.model("signaltowers", SignalTowerSchema);


	/************************************/
	
	this.getLocationFromMessage = function(message, callback)
	{
		switch(message.positioningMethod)
		{
			case 'triangulate':
				getLocationByTower(message.towerSignals,callback)
				break;
			case 'gps':
				callback(null,getLocationByGps(message.gpsReading));
				break;
			case 'none':
				callback(null, {lat:0,lon:0});
				break;
		}
	}






}