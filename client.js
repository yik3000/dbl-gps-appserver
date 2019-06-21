var stdin = process.openStdin();
var net = require('net');
//const host = 'localhost'
const host = '120.25.203.158'
const imei = '862609000109038';


var client = net.connect({port: 8883, host: host}, function() {
   console.log('connecting to server! ' + host);  
   console.log(formatPrompt(commands));
});

client.on('data', function(data) {
   console.log("--------Receiving Message--------");
   console.log(data.toString());
   console.log("-----------------------");
});

client.on('end', function() { 
   console.log('server disconnected');
});

replacements = {"%imei%": imei}

function replace(str){
str = str.replace(/%\w+%/g, function(all) {
   return replacements[all] || all;
});
return str;
}


commands = [
{index: 11, name: 'Send triangulation signal', value: '*MG201%imei%,AH&X460,0,9488,21552,86;9488,21559,86;9488,21553,87;9488,46734,92;9472,18735,95;9423,45548,95;9488,46693,96&E161206230245&B0000000000&M990&N13&Z42&T0004#'},
{index: 12, name: 'Respond to triangulation request', value: '*MG200%imei%,BA&X460,0,9488,21552,99;9488,21553,94;9423,45548,94;9472,18735,96;9488,46734,97;9488,46693,99;9488,21559,100&E161206165425&B0000000000&M990&N11&Z40&T0044#'},
{index: 13, name: 'Respond to GPS location request', value: '*MG200%imei%,BA&A10453022367901114032778600001508 16&X460,1,20858,47723,75;20858,40242,79;20858,29487,89;20858,8 111,91;20858,42321,92;20858,46832,94;20858,38111,96&E150101044 635&B0100000000&G001160&M440&N21&O0800&T0019#'},
{index: 1, name: 'Respond to server activation', value: '*MG200%imei%,YBE&T0002#'},

{index: 22, name: 'Into Normal Mode', value: '*MG201%imei%,AWV,0&T0001#'},
{index: 23, name: 'Into Sentry Mode', value: '*MG201%imei%,AWV,5&T0001#'},
{index: 24, name: 'Into Danger Mode', value: '*MG201%imei%,AWV,1&T0001#'},
{index: 25, name: 'Into Flight Mode', value: '*MG201%imei%,AWV,2&T0001#'},
{index: 26, name: 'Into Sleep Mode', value: '*MG201%imei%,AWV,6&T0001#'},

{index: 2, name: 'Respond to Mode Change Request', value: '*MG200%imei%,YAW&T0001#'},
{index: 21, name: 'Respond to Mode Request', value: '*MG200%imei%,YAH&T0001#'},
{index: 211, name: 'Respond to Server Activation', value: '*MG200%imei%,YBE&T0001#'},
{index: 212, name: 'Respond to Bluetooth Request', value: '*MG200%imei%,YBD&T0001#'},


{index:3, name: 'Activation Heartbeat', value: '*MG201%imei%,AB&A0732142233550011405829060520190600&B0000000000#'},

{index: 41, name: 'Bluetooth Connected', value: '*MG200%imei%,GA0#'},
{index: 42, name: 'Bluetooth Disconneted', value: '*MG200%imei%,GA1#'},
{index: 43, name: 'Bluetooth On', value: '*MG200%imei%,GA2#'},
{index: 44, name: 'Bluetooth Off', value: '*MG200%imei%,GA3#'},

{index: 51, name: 'Battery Low Warning', value: '*MG201%imei%,AA&A0732142233550011405829060520190600&B0000000040&M200#'},
{index: 99, name: 'Error Code', value: '��Xi�����8�&A��~�'},

{index: 60, name:'Heartbeat', value: '*MG200862609000084066,AJV:VKEL_P10_20170301_B701,DOMAIN:120.25.203.158,IP:120.25.203.158,PORT:8883,ICCID:89860031191509973932,ACC:0,DD:0,DY:0,SMSSW:1,CALLSW:1#'}

]

function getCommand (type)
{
	var command = commands.find(function(item){
	return item.index == type
	})
	commandStr = replace(command.value);
	return commandStr;
}
function formatPrompt(commands)
{
return commands.map(function(command){
return command.index.toString() + ":" + command.name;
}).join('\n')
}


stdin.on('data', function(data)
{
	console.log('Command: ' + data);
	if(data.toString().trim() == '')
	{
		console.log('----------')
		console.log(formatPrompt(commands));		
		console.log('----------')
	}
	else
	{
		commandIndex = parseInt(data.toString().trim())
		 console.log('-------Data Sent-------')
		 console.log(getCommand(commandIndex));
		 console.log('---------------------')
		 client.write(getCommand(commandIndex));
	}

})