#!/usr/bin/env node

/**
 * WebSocket client for testing the WebSocket server
 * This script connects to the WebSocket server and logs messages
 */

import WebSocket from 'ws';
import readline from 'readline';

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : '8080';

// Create WebSocket connection
const ws = new WebSocket(`ws://localhost:${port}/ws`);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connection opened
ws.on('open', () => {
  console.log('🔌 Connected to WebSocket server');
  console.log('Type commands in the format: type:data');
  console.log('Examples:');
  console.log('  start_scanner:fortinet');
  console.log('  stop_scanner:fortinet');
  console.log('  get_logs:100');
  console.log('Type "exit" to quit');
  
  promptUser();
});

// Listen for messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log(`📥 Received message: ${message.type}`);
    console.log(JSON.stringify(message.data, null, 2));
  } catch (error) {
    console.error('Error parsing message:', error);
    console.log('Raw message:', data);
  }
  
  promptUser();
});

// Connection closed
ws.on('close', () => {
  console.log('🔌 Disconnected from WebSocket server');
  rl.close();
  process.exit(0);
});

// Connection error
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
  rl.close();
  process.exit(1);
});

// Prompt user for input
function promptUser() {
  rl.question('> ', (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log('Exiting...');
      ws.close();
      rl.close();
      return;
    }
    
    try {
      if (input.includes(':')) {
        const [type, dataStr] = input.split(':');
        let data;
        
        // Try to parse as JSON if it looks like an object
        if (dataStr.trim().startsWith('{')) {
          data = JSON.parse(dataStr);
        } else {
          data = dataStr;
        }
        
        const message = {
          type,
          data,
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(message));
        console.log(`📤 Sent message: ${type}`);
      } else {
        console.log('Invalid format. Use type:data');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
}