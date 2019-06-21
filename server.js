const TcpServer = require('./tcp.js')
const WatchServer = require('./watchServer.js')
var config = require('./config');

const SocketLibrary = require('./lib/socket.js');
const DeviceLibrary = require('./lib/device.js');
const MessageLibrary = require('./lib/message.js');
const LocationLibrary = require('./lib/location.js');
const PushLibrary = require('./lib/push.js');
const HeartbeatLibrary = require('./lib/heartbeat.js');

const HOST = '127.0.0.1';

const tcpPort = 8883;
const webServerPort = 8081;
const restfulPort =  8085;

// *** initiate library ***
var applicationProfile = config.gps;
var messageLibrary = new MessageLibrary(applicationProfile);
var heartbeatLibrary = new HeartbeatLibrary(applicationProfile);
var locationLibrary = new LocationLibrary(applicationProfile);
var socketLibrary = new SocketLibrary(HOST,tcpPort, applicationProfile, messageLibrary,heartbeatLibrary,locationLibrary);
socketLibrary.init();
var deviceLibrary = new DeviceLibrary(applicationProfile);
var pushLibrary = new PushLibrary(applicationProfile, deviceLibrary);
// *************
var tcpServer = new TcpServer(applicationProfile, socketLibrary, deviceLibrary, heartbeatLibrary, pushLibrary);
var watchServer = new WatchServer(config, socketLibrary, deviceLibrary);

