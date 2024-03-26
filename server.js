const WebSocket = require('ws');
const net = require('net');

const wss = new WebSocket.Server({ port: 8081 });
let lastCommandTime = Date.now();
let client = new net.Socket();

function checkInactivity() {
    const currentTime = Date.now();
    const timeSinceLastCommand = currentTime - lastCommandTime;

    // Close the TCP connection if 60 seconds have passed without a new command
    if (timeSinceLastCommand >= 60000 && client && !client.destroyed) {
        console.log('Closing TCP connection due to inactivity.');
        client.destroy();
    }

    // Close the WebSocket connection if 2 minutes have passed without a new command
    if (timeSinceLastCommand >= 120000) {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) return ws.terminate();
            
            ws.isAlive = false;
            ws.ping();
        });
    }
}

// Regularly check for inactivity
setInterval(checkInactivity, 30000); // Check every 30 seconds

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);

    ws.on('message', (message) => {
        console.log('Received: %s', message);
        lastCommandTime = Date.now(); // Update the time a command was last received

        if (!client || client.destroyed) {
            client = new net.Socket();
            client.connect({ host: '192.168.4.1', port: 100 }, () => {
                console.log('TCP Connection established');
                client.write(message);
            });

            client.on('close', () => console.log('TCP connection closed'));
            client.on('error', (err) => console.error('TCP Error: ', err));
        } else {
            client.write(message);
        }
    });

    ws.on('close', () => console.log('WebSocket client disconnected'));
});

console.log('WebSocket server started on ws://localhost:8081');
