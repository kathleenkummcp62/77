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

// VPN credentials for testing
const vpnCredentials = {
  'fortinet.txt': [
    'https://200.113.15.26:4443;guest;guest',
    'https://195.150.192.5:443;guest;guest',
    'https://88.117.174.186:443;guest;guest',
    'https://118.238.205.22:10443;guest;guest',
    'https://49.205.180.172:10443;guest;guest',
    'https://37.142.24.153:10443;guest;guest',
    'https://206.74.89.110:10443;guest;guest',
    'https://222.119.99.24:10443;guest;guest',
    'https://220.241.67.242:3443;guest;guest'
  ],
  'paloalto.txt': [
    'https://216.229.124.44:443;test;test',
    'https://72.26.131.86:443;test;test',
    'https://216.247.223.23:443;test;test',
    'https://216.229.124.44:443;test;test',
    'https://72.26.131.86:443;test;test',
    'https://216.247.223.23:443;test;test'
  ],
  'sonicwall.txt': [
    'https://69.21.239.19:4433;test;test;LocalDomain',
    'https://68.189.7.50:4433;test;test;hudmech.local',
    'https://74.92.44.25:4433;test;test;microgroup.local',
    'https://96.70.252.65:4433;test;test;fm.local',
    'https://24.55.137.209:443;test;test;CMAAA15',
    'https://50.198.63.225:4433;test;test;MADISON',
    'https://96.89.127.141:4433;test;test;maloneysocular',
    'https://12.215.186.74:443;guest;guest;parksprings.com',
    'https://131.148.177.186:4433;guest;guest;dhte.dhtellc.com'
  ],
  'sophos.txt': [
    'https://213.139.132.204:6443;test;test;intern.gutenberg-shop.de',
    'https://124.254.117.194:8443;test;test;fcc.wa.edu.au',
    'https://80.151.100.43:4433;test;test;bilstein.local',
    'https://213.139.132.205:6443;test;test;intern.gutenberg-shop.de',
    'https://167.98.99.132:443;test;test;unknown_domain',
    'https://212.100.41.190:4445;test;test;verwaltung.local'
  ],
  'watchguard.txt': [
    'https://96.92.230.186:443:Firebox-DB:mpbchicago.masterpaperbox.com:printer:P@55w0rd',
    'https://75.146.37.105:444:Firebox-DB:comercial:P@ssw0rd123',
    'https://50.86.120.107:443:Firebox-DB:comercial:P@ssw0rd123',
    'https://35.131.180.112:443:Firebox-DB:engineer:eng1neer1',
    'https://98.100.209.218:443:Firebox-DB:chris:Welcome1!',
    'https://96.56.65.26:4100:AuthPoint:Firebox-DB:hudsonss.com:media:Password@1',
    'https://35.21.135.132:443:Firebox-DB:intranet:Password@1',
    'https://98.63.175.96:8595:Firebox-DB:download:Download#',
    'https://72.23.172.37:443:Firebox-DB:luis:pa$$w0rd',
    'https://12.2.120.90:4100:AuthPoint:Firebox-DB:RADIUS:banneroak.local:default:password@1'
  ],
  'cisco.txt': [
    'https://74.209.225.52:443:test:test:remote_access',
    'https://67.202.240.148:443:test:test:ANYCONNECT',
    'https://72.23.123.187:443:test:test:AnyConnect_HVAC',
    'https://72.32.124.5:443:test:test:POLITICALDATA-ANYCONNECT-SSL',
    'https://209.43.59.2:443:test:test:remote_access',
    'https://204.235.221.57:8443:test:test',
    'https://184.106.123.244:443:test:test:ANYCONNECT-GAVIOTA-SA',
    'https://72.73.71.60:443:guest;guest'
  ]
};

// SSH credentials for worker servers
const sshCredentials = [
  '194.0.234.203;root;1jt5a7p4FZTM0vY',
  '77.90.185.26;root;2dF9bS7UV6wvHy3',
  '185.93.89.206;root;G6t8NnHgI4i0x7K',
  '185.93.89.35;root;2asI5uvS047AqHM'
];

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
  
  for (const [filename, credentials] of Object.entries(vpnCredentials)) {
    const filePath = path.join(projectRoot, 'creds', filename);
    await fs.writeFile(filePath, credentials.join('\n'));
    console.log(`Created file: creds/${filename}`);
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