#!/usr/bin/env node

/**
 * Setup environment for VPN Bruteforce Dashboard
 * This script creates necessary directories and files for testing
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

let vpnCredentials = {};
let sshCredentials = [];

async function loadSetupData() {
  const dataPath = path.join(projectRoot, 'setup-data.json');
  const data = await fs.readJson(dataPath);
  vpnCredentials = data.vpnCredentials || {};
  sshCredentials = data.sshCredentials || [];
}

// Create necessary directories
async function createDirectories() {
  console.log('Creating necessary directories...');
  
  const directories = [
    'Generated',
    'Valid',
    'creds/dictionaries'
  ];
  
  for (const dir of directories) {
    const dirPath = path.join(projectRoot, dir);
    await fs.ensureDir(dirPath);
    console.log(`Created directory: ${dir}`);
  }
}

// Create VPN credential files
async function createVpnCredentialFiles() {
  console.log('Creating VPN credential files...');

  for (const [type, credentials] of Object.entries(vpnCredentials)) {
    const filePath = path.join(projectRoot, 'creds', `${type}.txt`);
    await fs.writeFile(filePath, credentials.join('\n'));
    console.log(`Created file: creds/${type}.txt`);
  }
}

// Create SSH credentials file
async function createSshCredentialsFile() {
  console.log('Creating SSH credentials file...');
  
  const filePath = path.join(projectRoot, 'credentials.txt');
  await fs.writeFile(filePath, sshCredentials.join('\n'));
  console.log('Created file: credentials.txt');
}

// Create test scanner script
async function createTestScannerScript() {
  console.log('Creating test scanner script...');
  
  const testScannerPath = path.join(projectRoot, 'test_scanner.py');
  const testScannerContent = `#!/usr/bin/env python3
"""
Test scanner for VPN credentials
"""

import os
import sys
import json
import time
import random
import argparse
from pathlib import Path

# Command line arguments
parser = argparse.ArgumentParser(description="VPN Scanner Simulator")
parser.add_argument("--vpn-type", default="fortinet", help="VPN type (fortinet, paloalto, sonicwall, sophos, watchguard, cisco)")
parser.add_argument("--creds-file", help="Credentials file")
parser.add_argument("--output", default="valid.txt", help="Output file for valid credentials")
args = parser.parse_args()

# Load credentials
creds_file = args.creds_file
if not creds_file:
    creds_file = f"creds/{args.vpn_type}.txt"

if not os.path.exists(creds_file):
    print(f"❌ Credentials file not found: {creds_file}")
    sys.exit(1)

with open(creds_file, "r") as f:
    credentials = [line.strip() for line in f if line.strip() and not line.startswith("#")]

# Statistics
stats = {
    "goods": 0,
    "bads": 0,
    "errors": 0,
    "offline": 0,
    "ipblock": 0,
    "processed": 0,
    "rps": 0
}

# Stats file
stats_file = f"stats_{os.getpid()}.json"

# Simulate scanning
print(f"🚀 Starting {args.vpn_type.upper()} scanner")
print(f"📊 Loaded {len(credentials)} credentials")

valid_file = open(args.output, "a")

try:
    start_time = time.time()
    for i, cred in enumerate(credentials):
        # Simulate delay
        time.sleep(random.uniform(0.1, 0.5))
        
        # For demo purposes, we'll mark all credentials as valid
        # In a real scanner, this would be determined by actual testing
        result = "valid"
        
        if result == "valid":
            stats["goods"] += 1
            valid_file.write(f"{cred}\\n")
            valid_file.flush()
            print(f"✅ VALID: {cred}")
        elif result == "invalid":
            stats["bads"] += 1
        elif result == "error":
            stats["errors"] += 1
            print(f"❌ ERROR: {cred}")
        elif result == "offline":
            stats["offline"] += 1
            print(f"⏰ TIMEOUT: {cred}")
        elif result == "ipblock":
            stats["ipblock"] += 1
            print(f"🚫 BLOCKED: {cred}")
        
        stats["processed"] += 1
        stats["rps"] = stats["processed"] / (time.time() - start_time)
        
        # Update statistics
        if i % 5 == 0:
            with open(stats_file, "w") as f:
                json.dump(stats, f)
            
            # Display current statistics
            elapsed = time.time() - start_time
            print(f"\\r🔥 G:{stats['goods']} B:{stats['bads']} E:{stats['errors']} Off:{stats['offline']} Blk:{stats['ipblock']} | ⚡{stats['rps']:.1f}/s | ⏱️{int(elapsed)}s", end="")
    
    print("\\n✅ Scanning completed!")

except KeyboardInterrupt:
    print("\\n🛑 Scanning interrupted by user")
finally:
    valid_file.close()
    with open(stats_file, "w") as f:
        json.dump(stats, f)
`;

  await fs.writeFile(testScannerPath, testScannerContent);
  await fs.chmod(testScannerPath, '755');
  console.log('Created file: test_scanner.py');
}

// Create config files
async function createConfigFiles() {
  console.log('Creating configuration files...');
  
  // Create config.txt
  const configPath = path.join(projectRoot, 'config.txt');
  await fs.writeFile(configPath, 'threads = 2500\n');
  console.log('Created file: config.txt');
  
  // Create proxy_config.txt
  const proxyConfigPath = path.join(projectRoot, 'proxy_config.txt');
  await fs.writeFile(proxyConfigPath, '\n');
  console.log('Created file: proxy_config.txt');
}

// Configure firewall to allow external access
async function configureFirewall() {
  console.log('Configuring firewall for external access...');
  
  try {
    // Check if we have sudo access
    const hasSudo = process.getuid && process.getuid() === 0;
    
    if (hasSudo) {
      // Open ports for the application
      execSync('ufw allow 3000/tcp', { stdio: 'inherit' });
      execSync('ufw allow 5173/tcp', { stdio: 'inherit' });
      execSync('ufw allow 8080/tcp', { stdio: 'inherit' });
      console.log('✅ Firewall configured to allow external access');
    } else {
      console.log('⚠️ Cannot configure firewall - not running as root');
      console.log('To allow external access, run the following commands:');
      console.log('  sudo ufw allow 3000/tcp');
      console.log('  sudo ufw allow 5173/tcp');
      console.log('  sudo ufw allow 8080/tcp');
    }
  } catch (error) {
    console.log('⚠️ Failed to configure firewall:', error.message);
    console.log('To allow external access, run the following commands:');
    console.log('  sudo ufw allow 3000/tcp');
    console.log('  sudo ufw allow 5173/tcp');
    console.log('  sudo ufw allow 8080/tcp');
  }
}

// Main function
async function main() {
  console.log('=== VPN Bruteforce Dashboard Environment Setup ===');

  try {
    const runtimeIndex = process.argv.indexOf('--runtime');
    const runtime = runtimeIndex !== -1 ? (process.argv[runtimeIndex + 1] || 'node') : 'node';

    await loadSetupData();
    // Create directories
    await createDirectories();
    
    // Create VPN credential files
    await createVpnCredentialFiles();
    
    // Create SSH credentials file
    await createSshCredentialsFile();
    
    // Create test scanner script
    await createTestScannerScript();
    
    // Create config files
    await createConfigFiles();
    
    // Configure firewall
    await configureFirewall();

    if (runtime === 'python') {
      try {
        execSync('python3 -m pip install -r requirements.txt', { stdio: 'inherit' });
      } catch (err) {
        console.log('⚠️ Failed to install Python dependencies:', err.message);
      }
    } else if (runtime === 'node') {
      try {
        execSync('npm install', { stdio: 'inherit' });
      } catch (err) {
        console.log('⚠️ Failed to install Node dependencies:', err.message);
      }
    }

    console.log('\n✅ Environment setup completed successfully!');
    console.log('\nYou can now run the following commands:');
    console.log('  - npm run dev  (to start the dashboard)');
    console.log('  - python3 test_scanner.py --vpn-type fortinet  (to test VPN scanning)');
    
    return true;
  } catch (error) {
    console.error(`\n❌ Error during setup: ${error.message}`);
    return false;
  }
}

// Run the main function
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});