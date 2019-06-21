const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const AccountsRoutes = require('./api/accounts.js');
const DevicesRoutes = require('./api/devices.js');


module.exports = function ApiServer(PORT, applicationProfile, deviceLibrary) {
	//restfulPort = PORT;
	var app = express();
	app.set('superSecret', applicationProfile.secret);
	app.set('application', applicationProfile.gps);
	app.use(cors());
	app.use(bodyParser.urlencoded({ extended: false}));
	app.use('/avatar', express.static(__dirname + '/uploads/profiles/'));
	app.use('/orderTracking', express.static(__dirname + '/uploads/orders/'));


	var accountsRoutes = AccountsRoutes(app, applicationProfile);
	var devicesRoute = DevicesRoutes(app, deviceLibrary)

	app.listen(PORT);
	console.log('start restful service on port: ' + PORT)

}

