#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

// Ensure the vite binary is executable
try {
  const vitePath = './node_modules/.bin/vite';
  if (fs.existsSync(vitePath)) {
    fs.chmodSync(vitePath, '755');
    console.log('Set executable permissions on vite binary');
  }
} catch (error) {
  console.error('Error setting permissions:', error);
}

// Run the build command
try {
  console.log('Starting Vite build...');
  execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}