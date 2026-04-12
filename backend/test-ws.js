const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected to backend WS');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (err) => console.error('WS Error:', err));
ws.on('close', () => {
  console.log('WS Closed');
  process.exit();
});

setTimeout(() => {
  console.log('Timeout. Exiting...');
  process.exit();
}, 5000);
