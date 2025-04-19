import { io } from 'socket.io-client';

// Create the socket connection with reconnection capability
const socket = io('https://ghostchat-i1e8.onrender.com', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  timeout: 10000,
});

// Add connection event listeners
socket.on('connect', () => {
  console.log('✅ Connected to server');
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log(`❌ Disconnected: ${reason}`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`✅ Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_failed', () => {
  console.error('❌ Failed to reconnect');
});

export default socket;