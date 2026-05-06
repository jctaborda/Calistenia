#!/usr/bin/env node

/**
 * Service Worker Version Updater
 * 
 * This script updates the service worker cache version based on:
 * 1. Git commit hash (if available)
 * 2. Build timestamp (fallback)
 * 
 * Usage:
 *   npm run update-sw     # Update version before build
 *   node scripts/update-sw-version.js  # Run directly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SW_FILE_PATH = path.join(__dirname, '..', 'sw.js');
const VERSION_PATTERN = /VERSION:\s*typeof\s+__BUILD_VERSION__\s+!==\s+'undefined'\s+\?[__BUILD_VERSION__]\s+:\s+generateVersion\(\)/;

function getGitHash() {
  try {
    // Get short commit hash (first 8 chars)
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    
    if (gitHash) {
      return `commit-${gitHash}`;
    }
  } catch (error) {
    // Git not available or not a git repo
    console.log('[Version Updater] No git repository found, using timestamp fallback');
  }
  
  return null;
}

function getBuildInfo() {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}`;
}

function getCurrentVersion() {
  try {
    const swContent = fs.readFileSync(SW_FILE_PATH, 'utf-8');
    const match = swContent.match(/const\s+VERSION\s*=\s*'([^']+)'/);
    
    if (match) {
      return match[1];
    }
    
    // Check for dynamic version pattern
    if (swContent.includes('__BUILD_VERSION__')) {
      return 'dynamic';
    }
  } catch (error) {
    console.error('[Version Updater] Error reading SW file:', error.message);
  }
  
  return null;
}

function updateServiceWorkerVersion(gitHash, timestamp) {
  try {
    const swContent = fs.readFileSync(SW_FILE_PATH, 'utf-8');
    
    // Replace the VERSION definition with the new version
    const newVersion = gitHash || `timestamp-${timestamp}`;
    
    const updatedContent = swContent.replace(
      /const\s+VERSION\s*=\s*[^;]+;/,
      `const VERSION = '${newVersion}';`
    );
    
    fs.writeFileSync(SW_FILE_PATH, updatedContent);
    
    console.log(`[Version Updater] Service Worker version updated to: ${newVersion}`);
    return true;
  } catch (error) {
    console.error('[Version Updater] Error updating SW file:', error.message);
    return false;
  }
}

function main() {
  console.log('='.repeat(70));
  console.log('Service Worker Version Updater');
  console.log('='.repeat(70));
  console.log();
  
  // Check if service worker already has dynamic versioning
  const currentVersion = getCurrentVersion();
  
  if (currentVersion === 'dynamic') {
    console.log('[Info] Service Worker already uses dynamic versioning (__BUILD_VERSION__)');
    console.log('[Info] No update needed. This file can be used as-is in your build system.');
    console.log();
    console.log('To use this pattern:');
    console.log('  1. Pass __BUILD_VERSION__ during build (e.g., via webpack DefinePlugin)');
    console.log('  2. Or run update-sw script to inject timestamp-based version');
    console.log();
  } else if (currentVersion && !/^v\d/.test(currentVersion)) {
    console.log('[Info] Service Worker has hardcoded version:', currentVersion);
    console.log('[Recommendation] Replace sw.js with the updated dynamic versioning pattern.');
    console.log();
    
    // Generate new version for replacement
    const gitHash = getGitHash();
    const timestamp = getBuildInfo();
    const proposedVersion = gitHash || `timestamp-${timestamp}`;
    
    console.log('[Proposed] New version:', proposedVersion);
    console.log();
  }
  
  // Generate new version (for manual reference or script execution)
  const gitHash = getGitHash();
  const timestamp = getBuildInfo();
  const finalVersion = gitHash || `timestamp-${timestamp}`;
  
  console.log('='.repeat(70));
  console.log('Version Information');
  console.log('='.repeat(70));
  console.log(`Git Hash:      ${gitHash || 'Not available (not a git repo or no commits)'}`);
  console.log(`Timestamp:     ${timestamp}`);
  console.log(`Proposed SW:   ${finalVersion}`);
  console.log();
  
  if (process.argv.includes('--update')) {
    console.log('[Action] Updating service worker...');
    const success = updateServiceWorkerVersion(gitHash, timestamp);
    
    if (success) {
      console.log();
      console.log('✅ Service Worker updated successfully!');
    } else {
      console.log();
      console.log('❌ Failed to update service worker.');
      process.exit(1);
    }
  } else {
    console.log('[Usage] To auto-update version, run:');
    console.log('        npm run update-sw     (if configured)');
    console.log('        node scripts/update-sw-version.js --update');
    console.log();
    console.log('[Build Integration]');
    console.log('  Add to your package.json scripts:');
    console.log('    "prebuild": "node scripts/update-sw-version.js --update",');
    console.log();
    console.log('  Or use webpack DefinePlugin:');
    console.log('    new webpack.DefinePlugin({ __BUILD_VERSION__: JSON.stringify(version) })');
  }
  
  console.log('='.repeat(70));
}

main();
