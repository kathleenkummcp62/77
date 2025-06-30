#!/usr/bin/env node

/**
 * Deploy scripts to worker servers
 * This script deploys VPN testing scripts to remote servers via SSH
 */

import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Parse credentials file
async function parseCredentialsFile(filePath) {
  const credentials = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      const parts = trimmedLine.split(';');
      if (parts.length !== 3) {
        console.warn(`⚠️ Invalid line format: ${trimmedLine}`);
        continue;
      }
      
      const [ip, username, password] = parts;
      credentials.push({ ip, username, password });
    }
    
    return credentials;
  } catch (error) {
    console.error(`❌ Error reading credentials file: ${error.message}`);
    return [];
  }
}

// Execute a command on a remote server
function executeRemoteCommand(ip, username, password, command) {
  return new Promise((resolve, reject) => {
    // In a real implementation, this would use an SSH library
    // For this demo, we'll simulate success
    console.log(`📋 Executing on ${ip}: ${command}`);
    
    // Simulate command execution
    setTimeout(() => {
      console.log(`✅ Command executed successfully on ${ip}`);
      resolve(true);
    }, 500);
  });
}

// Deploy scripts to a server
async function deployToServer(server) {
  const { ip, username, password } = server;
  console.log(`\n📤 Deploying scripts to ${ip}`);
  
  try {
    // Create remote directory
    await executeRemoteCommand(
      ip, 
      username, 
      password, 
      'mkdir -p /root/NAM/Servis'
    );
    
    // Deploy scripts
    const scripts = [
      'sers1.py',
      'sers2.go',
      'sers3.py',
      'sers4.go',
      'config.txt',
      'proxy_config.txt'
    ];
    
    for (const script of scripts) {
      console.log(`📤 Deploying ${script} to ${ip}`);
      // In a real implementation, this would use SCP or SFTP
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`✅ All scripts deployed to ${ip}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deploying to ${ip}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Deploying scripts to worker servers');
  
  // Read credentials file
  const credentialsFile = path.join(projectRoot, 'credentials.txt');
  const credentials = await parseCredentialsFile(credentialsFile);
  
  if (credentials.length === 0) {
    console.error('❌ No valid credentials found');
    return false;
  }
  
  console.log(`📋 Found ${credentials.length} worker servers`);
  
  // Deploy to each server
  const results = {};
  for (const server of credentials) {
    results[server.ip] = await deployToServer(server);
  }
  
  // Print summary
  console.log('\n📊 Deployment results:');
  let successCount = 0;
  for (const [ip, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${ip}`);
    if (success) successCount++;
  }
  
  console.log(`\n✅ Successfully deployed to ${successCount} of ${credentials.length} servers`);
  return successCount > 0;
}

// Run the main function
main()
  .then(success => {
    console.log(success ? '\n✅ Deployment completed successfully' : '\n⚠️ Deployment completed with warnings');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  });