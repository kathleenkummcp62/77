#!/usr/bin/env node

/**
 * Create default admin account
 * This script creates a default admin account with the specified credentials
 */

import bcrypt from 'bcryptjs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Default admin credentials
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin',
  role: 'admin'
};

// Static authentication token
const STATIC_AUTH_TOKEN = "d@DMJYXf#5egNh7@3j%=C9vjhs9dH*nv";

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get users from localStorage or create empty object
function getUsers() {
  try {
    // In Node.js environment, we need to read from a file instead of localStorage
    const usersPath = path.join(projectRoot, 'auth_users.json');
    
    if (fs.existsSync(usersPath)) {
      const data = fs.readFileSync(usersPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading users:', error);
  }
  
  return {};
}

// Save users to file
function saveUsers(users) {
  try {
    // In Node.js environment, we need to write to a file instead of localStorage
    const usersPath = path.join(projectRoot, 'auth_users.json');
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Create admin account
function createAdmin(username, password, role) {
  const users = getUsers();
  
  // Check if admin account already exists
  if (users[username]) {
    console.log(`User '${username}' already exists.`);
    rl.question('Do you want to reset the password? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        // Update password
        const hashedPassword = bcrypt.hashSync(password, 10);
        users[username].password = hashedPassword;
        saveUsers(users);
        console.log(`Password for '${username}' has been reset.`);
      } else {
        console.log('Password reset cancelled.');
      }
      rl.close();
    });
    return;
  }
  
  // Create new admin account
  const hashedPassword = bcrypt.hashSync(password, 10);
  users[username] = {
    password: hashedPassword,
    user: {
      id: Date.now().toString(),
      username,
      role
    }
  };
  
  saveUsers(users);
  console.log(`Admin account '${username}' created successfully.`);
  rl.close();
}

// Main function
function main() {
  console.log('=== Create Admin Account ===');
  
  // Check if custom credentials should be used
  rl.question('Use default admin credentials (admin/admin)? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      // Use default credentials
      createAdmin(DEFAULT_ADMIN.username, DEFAULT_ADMIN.password, DEFAULT_ADMIN.role);
    } else {
      // Get custom credentials
      rl.question('Enter username: ', (username) => {
        rl.question('Enter password: ', (password) => {
          rl.question('Enter role (admin/user/viewer): ', (role) => {
            if (!['admin', 'user', 'viewer'].includes(role)) {
              console.error('Invalid role. Must be one of: admin, user, viewer');
              rl.close();
              return;
            }
            
            createAdmin(username, password, role);
          });
        });
      });
    }
  });
}

// Run the main function
main();