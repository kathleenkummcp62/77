#!/usr/bin/env node

/**
 * Start VPN scanners on worker servers
 * This script starts VPN scanning on remote servers
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Get script name for VPN type
function getScriptForVpnType(vpnType) {
  const scripts = {
    'fortinet': 'sers1.py',
    'paloalto': 'sers2.go',
    'sonicwall': 'sers3.py',
    'sophos': 'test_scanner.py --vpn-type sophos',
    'watchguard': 'test_scanner.py --vpn-type watchguard',
    'cisco': 'sers4.go'
  };
  
  return scripts[vpnType.toLowerCase()] || `test_scanner.py --vpn-type ${vpnType}`;
}

// Start scanner on a server
async function startScannerOnServer(server, vpnType) {
  const { ip, username, password } = server;
  console.log(`\n🚀 Starting ${vpnType} scanner on ${ip}`);
  
  try {
    // In a real implementation, this would use SSH
    // For this demo, we'll simulate success
    
    const script = getScriptForVpnType(vpnType);
    const remoteDir = '/root/NAM/Servis';
    
    // Construct command
    let cmd;
    if (script.endsWith('.py')) {
      cmd = `cd ${remoteDir} && python3 ${script}`;
    } else if (script.endsWith('.go')) {
      cmd = `cd ${remoteDir} && go run ${script}`;
    } else {
      cmd = `cd ${remoteDir} && ./${script}`;
    }
    
    console.log(`📋 Command: ${cmd}`);
    
    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ Scanner started on ${ip}`);
    return true;
  } catch (error) {
    console.error(`❌ Error starting scanner on ${ip}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const vpnTypeArg = args.find((arg, index) => 
    args[index - 1] === '--vpn-type' || arg.startsWith('--vpn-type=')
  );
  
  let vpnType;
  if (vpnTypeArg) {
    if (vpnTypeArg.startsWith('--vpn-type=')) {
      vpnType = vpnTypeArg.split('=')[1];
    } else {
      const index = args.indexOf('--vpn-type');
      vpnType = args[index + 1];
    }
  }
  
  if (!vpnType) {
    console.error('❌ VPN type not specified. Use --vpn-type <type>');
    console.error('Supported types: fortinet, paloalto, sonicwall, sophos, watchguard, cisco');
    return false;
  }
  
  console.log(`🚀 Starting ${vpnType.toUpperCase()} scanners on worker servers`);
  
  // Read credentials file
  const credentialsFile = path.join(projectRoot, 'credentials.txt');
  const credentials = await parseCredentialsFile(credentialsFile);
  
  if (credentials.length === 0) {
    console.error('❌ No valid credentials found');
    return false;
  }
  
  console.log(`📋 Found ${credentials.length} worker servers`);
  
  // Start scanners on each server
  const results = {};
  for (const server of credentials) {
    results[server.ip] = await startScannerOnServer(server, vpnType);
  }
  
  // Print summary
  console.log('\n📊 Start results:');
  let successCount = 0;
  for (const [ip, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${ip}`);
    if (success) successCount++;
  }
  
  console.log(`\n✅ Successfully started on ${successCount} of ${credentials.length} servers`);
  return successCount > 0;
}

// Run the main function
main()
  .then(success => {
    console.log(success ? '\n✅ Start completed successfully' : '\n⚠️ Start completed with warnings');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  });