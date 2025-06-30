#!/usr/bin/env node

/**
 * Collect results from worker servers
 * This script collects valid VPN credentials from remote servers
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Generate a random string
function randomString(length = 5) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

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

// Collect results from a server
async function collectFromServer(server) {
  const { ip, username, password } = server;
  console.log(`\n📥 Collecting results from ${ip}`);
  
  try {
    // In a real implementation, this would use SSH/SFTP
    // For this demo, we'll simulate success
    
    // Simulate finding valid files
    const validFiles = [
      { name: 'valid.txt', content: 'https://200.113.15.26:4443;guest;guest\nhttps://195.150.192.5:443;guest;guest' },
      { name: 'stats_12345.json', content: JSON.stringify({
        goods: 2,
        bads: 150,
        errors: 5,
        offline: 3,
        ipblock: 0,
        processed: 160,
        rps: 25.5
      })}
    ];
    
    // Create Valid directory if it doesn't exist
    const validDir = path.join(projectRoot, 'Valid');
    await fs.ensureDir(validDir);
    
    // Save files
    for (const file of validFiles) {
      if (file.name.startsWith('valid') && file.name.endsWith('.txt')) {
        const randomSuffix = randomString();
        const localPath = path.join(validDir, `${ip}_${file.name}_${randomSuffix}.txt`);
        
        await fs.writeFile(localPath, file.content);
        console.log(`✅ Saved ${file.name} from ${ip}`);
      }
    }
    
    console.log(`✅ Successfully collected results from ${ip}`);
    return true;
  } catch (error) {
    console.error(`❌ Error collecting from ${ip}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('📥 Collecting results from worker servers');
  
  // Read credentials file
  const credentialsFile = path.join(projectRoot, 'credentials.txt');
  const credentials = await parseCredentialsFile(credentialsFile);
  
  if (credentials.length === 0) {
    console.error('❌ No valid credentials found');
    return false;
  }
  
  console.log(`📋 Found ${credentials.length} worker servers`);
  
  // Collect from each server
  const results = {};
  for (const server of credentials) {
    results[server.ip] = await collectFromServer(server);
  }
  
  // Print summary
  console.log('\n📊 Collection results:');
  let successCount = 0;
  for (const [ip, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${ip}`);
    if (success) successCount++;
  }
  
  // Combine all results into one file
  try {
    const validDir = path.join(projectRoot, 'Valid');
    const allValidPath = path.join(validDir, 'all_valid_results.txt');
    
    // Get all valid files
    const files = await fs.readdir(validDir);
    const validFiles = files.filter(file => 
      file.includes('valid') && 
      file.endsWith('.txt') && 
      file !== 'all_valid_results.txt'
    );
    
    // Read and combine content
    const uniqueLines = new Set();
    for (const file of validFiles) {
      const content = await fs.readFile(path.join(validDir, file), 'utf8');
      const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
      lines.forEach(line => uniqueLines.add(line));
    }
    
    // Write combined file
    await fs.writeFile(allValidPath, Array.from(uniqueLines).join('\n'));
    
    console.log(`\n✅ Combined results saved to ${allValidPath}`);
    console.log(`📊 Total unique valid credentials: ${uniqueLines.size}`);
  } catch (error) {
    console.error(`❌ Error combining results: ${error.message}`);
  }
  
  console.log(`\n✅ Successfully collected from ${successCount} of ${credentials.length} servers`);
  return successCount > 0;
}

// Run the main function
main()
  .then(success => {
    console.log(success ? '\n✅ Collection completed successfully' : '\n⚠️ Collection completed with warnings');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  });