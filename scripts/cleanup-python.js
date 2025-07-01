#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function findPythonFiles(dir, excludeDirs = ['venv', 'node_modules', 'dist']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!excludeDirs.includes(entry.name)) {
            traverse(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.py') && !entry.name.startsWith('test_')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Warning: Cannot read directory ${currentDir}`);
    }
  }
  
  traverse(dir);
  return files;
}

function deletePythonFiles() {
  const pythonFiles = findPythonFiles('.');
  
  console.log(`Found ${pythonFiles.length} Python files to delete:`);
  
  for (const file of pythonFiles) {
    try {
      fs.unlinkSync(file);
      console.log(`Deleted: ${file}`);
    } catch (error) {
      console.error(`Failed to delete ${file}: ${error.message}`);
    }
  }
  
  console.log('Cleanup completed.');
}

// Run the cleanup
deletePythonFiles();