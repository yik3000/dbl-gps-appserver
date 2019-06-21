const async = require('async');

function detectStatusMemo(uploadInfo){
		var statusMemo = "Unknown";
		switch(uploadInfo.commandCategory())
		{
			case "A":
				if(uploadInfo.commandType() == "H"){
					statusMemo = "Heartbeat"
				}
				else if(uploadInfo.commandType() == "B"){
					statusMemo = "Activation"
				}
				else if(uploadInfo.commandType() == "W"){
					var modeContent = uploadInfo.content()
					if(modeContent.type == "V")
					{
						var modeStr= "Unknown"
						switch(parseInt(modeContent.mode))
						{
							case 0:
								modeStr= "Standby"
								break;
							case 1:
								modeStr = "Tracking"
								break;
							case 2:
								modeStr = "Flight"
								break;
							case 4:
								modeStr = "Off"
								break;
							case 5:
								modeStr = "Sentry"
								break;
							case 6:
								modeStr = "Sleeping"
								break;
						}					
						statusMemo = "Enter [" + modeStr  + "] Mode"
					}
					else if(modeContent.type == "1")
					{
						statusMemo = "Firmware: "
					}
					else if(modeContent.type == "3"){
						statusMemo = "TimeSpan"
					}
					else if(modeContent.type == "8"){
						statusMemo = "Respond IP Port"
					}
					else if(modeContent.type == "O"){
						statusMemo = "Return GPS Status Reading"
					}
					else if(modeContent.type == "k"){
						statusMemo = "Heartbeat Frequency"
					}
					else if(modeContent.type == "i"){
						statusMemo = "Syncing Location"
					}
				}
				else if(uploadInfo.commandType() == "A"){
					statusMemo = "Battery Low"
				}
				break;
			case "Y":
				confirmContent = uploadInfo.content();
				if(confirmContent.commandCategory == "A" && confirmContent.commandType == "H" ){
					statusMemo = "Confirm Status Change"
				}
				if(confirmContent.commandCategory == "B" && confirmContent.commandType == "E" ){
					statusMemo = "Confirm Server Request Response"
				}
				if(confirmContent.commandCategory == "B" && confirmContent.commandType == "k" ){
					statusMemo = "Confirm Heartbeat Request"
				}
				if(confirmContent.commandCategory == "B" && confirmContent.commandType == 'i'){
					statusMemo = "Confirm Heartbeat Frequency Change Request"					
				}
				if(confirmContent.commandCategory == "B" && confirmContent.commandType == 'D'){
					statusMemo = "Confirm Function Request"					
				}				
				break;
			case "G":
				if(uploadInfo.commandType() == "A")
				{
					bluetoothStatus = parseInt(uploadInfo.content().bluetoothStatusValue)
					if(bluetoothStatus == 0){
						statusMemo = "Bluetooth connnected"
					}
					if(bluetoothStatus == 1){
						statusMemo = "Bluetooth disconnected"
					}
					if(bluetoothStatus == 2){
						statusMemo = "Bluetooth On"
					}
					if(bluetoothStatus == 3){
						statusMemo = "Bluetooth Off"
					}
				}
				break;
			case "B":
				if(uploadInfo.commandType() == "A")
				{
					statusMemo = "Location Set"
				}
		}
		return statusMemo;
}

function seperatePossibleLinkedData(data){
	//var regexForFirstPhase = /\*.+\#/g;
	parseResult = data.split('#')
	parseResult = parseResult.filter(x=>{
		match = x.match(/^(\*MG20.+)/)
		if(match != null && match[1] != ''){
			return true
		}
	})
	parseResult = parseResult.map(x=>{
		return x + '#'
	})
	return parseResult
}

function twoPhaseParsing(data)
{
	//phase 1 detects basic info
	var regexForFirstPhase = /^\*MG20(\d)(\d*),(\w)(\w)/g;
	var result = {
		message: "",
		needToRespond:false,
		imei: "",
		commandCategory: "",
		commandType: "",
		content: {},
		commands:[],
		positioningMethod: "none",
		isHeartbeat: false,
		containsLocationData: false,
		towerSignals: [],
		gpsReading: "",
	}
	result.message = data;
	parsedResult = regexForFirstPhase.exec(data)
	if(parsedResult == null){
		return null;
	}
	var parsedRespondBit = parsedResult[1];
	if(parsedRespondBit == '1')
	{
		result.needToRespond = true;
	}
	else if(parsedRespondBit == '0')
	{
		result.needToRespond = false;
	}
	result.imei = parsedResult[2];
	result.commandCategory = parsedResult[3];
	result.commandType = parsedResult[4];

	if(result.commandCategory == "A" && result.commandType == "W")
	{
		//for a device feed back
		//use a three keywords command parsing method
		var regexForMainCommand = /^\*MG20(\d)(\d*),(\w)(\w)(\w),(\w)(.*)#$/g;
		var subResult = regexForMainCommand.exec(data);
		result.content = { type: subResult[5], mode: subResult[6]};		
	}	
	else if(result.commandCategory == "Y")
	{
				//command confirmation
		var regexForMainCommand = /^\*MG20(\d)(\d*),(\w)(\w)(\w)(.*)#$/g;
		var subResult = regexForMainCommand.exec(data);
		result.content = { commandCategory: subResult[4], commandType:subResult[5] }
	}
	else if(result.commandCategory == "G" && result.commandType == "A")
	{
		var regexForMainCommand = /^\*MG20(\d)(\d*),(\w)(\w)(\w)#$/g;
		var subResult = regexForMainCommand.exec(data);
		result.content = { bluetoothStatusValue: subResult[5] }				
	}		
	else if((result.commandCategory == "A" && result.commandType == "H") 
		|| (result.commandCategory =="B" && result.commandType == "A")
		|| (result.commandCategory == "A" && result.commandType == "A")
		)
	{

		//a heart beat 
		//use a two keywords command parsing method
		result.isHeartbeat = true;
		var regexForMainCommand = /^\*MG20(\d)(\d*),(\w)(\w)(.*)#$/g;
		var subResult = regexForMainCommand.exec(data);				
		var commandsToken = subResult[5].split('&')
		var processedCommands = commandsToken.map(function(command,index){
			if(command!=null && command!='')
			{
				var regexForSingleCommand = /(\w)(.*)/;
				var parsedCommand = command.match(regexForSingleCommand);
				return { Command: parsedCommand[1], Value: parsedCommand[2]}				
			}
			else return null;
		});
		processedCommands.forEach(function(command,index){
			if(command!=null){
				result.commands.push(command);
			}
		})
	}
	return result;
} 

function parseTowerCommand (str)
{
		var regexForMainCommand = /^(\d+),(\d),(.*)/;
		result = str.match(regexForMainCommand)
		var countryCode = result[1];
		var carrierCode = result[2];
		var towerSignals = result[3];
		var towerSignalToken = towerSignals.split(';').map(function(signalStr){
			var signalStrToken = signalStr.split(',')
			return { countryCode: countryCode, carrierCode : parseInt(carrierCode), lac: signalStrToken[0], cellId: signalStrToken[1], strength: parseInt(signalStrToken[2])}
		})
		return towerSignalToken
}


function processStatus(message){
	message.commands.forEach(function(command){
			switch(command.Command)
			{
				case 'M':
					var wholeNumberOfPercentage = parseInt(command.Value.substr(0,2));
					var fraction = parseInt(command.Value.substr(2,1));
					deviceBatteryLevel = wholeNumberOfPercentage + (fraction * 0.1);
					message.content['battery'] = deviceBatteryLevel;
					break;
				case 'N':
					var gsmBit = parseInt(command.Value);
					gsmSignal = gsmBit;
					message.content['gsmSignal'] = gsmSignal;
					break;
				case 'O':
					var gpsBit = parseInt(command.Value.substr(0,2));
					var northStarBit = parseInt(command.Value.substr(2,4));
					gpsSignal = gpsBit;
					northStarSignal = northStarBit;
					message.content['gpsSignal'] = gpsSignal;
					message.content['northStarSignal'] = northStarSignal;
					break;
			}
		})
}


function processLocation(message){
	var containsA = message.commands.filter(command => {
		return command.Command === "A"
	}).length > 0;
	var containsX = message.commands.filter(command => {
		return command.Command === "X"
	}).length > 0;
	if(containsA){
		message.positioningMethod = "gps";
		message.containsLocationData = true;
	}
	else if(containsX){
		message.positioningMethod = "triangulate";
		message.containsLocationData = true;
	}
	else{
		message.positioningMethod = "none";
		message.containsLocationData = false;
	}

	message.commands.forEach(function(command){
		switch(command.Command)
		{
			case 'X':
				var signals = parseTowerCommand(command.Value);
				message.towerSignals = signals;
				break;
			case 'A':
				message.gpsReading = command.Value;
				break;
		}
	})			
}



module.exports = function MessageLibrary(applicationProfile) {
	this.parse = function(data, done)
	{
		var dataList = seperatePossibleLinkedData(data);
		returning = []
		async.each(dataList, function(data, done){
			var parsedInfo = twoPhaseParsing(data);
			if(parsedInfo != null){
				 if(parsedInfo.isHeartbeat == true)
				 {
				 	processStatus(parsedInfo);
				 	processLocation(parsedInfo);
				 }
				 returning.push(parsedInfo)
				 return done(null)
			}
			else return done(null)
		}, function(err){
			return done(err,returning);
		})

	}
	this.parseRequest = function(data)
	{
		
		
	}

}