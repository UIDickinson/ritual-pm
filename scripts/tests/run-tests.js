#!/usr/bin/env node

/**
 * Run Tests Script
 * 
 * Usage: node scripts/tests/run-tests.js
 */

console.log('Starting API tests...\n');

// Import and run tests
import('./api-tests.js').catch(err => {
  console.error('Failed to load tests:', err);
  process.exit(1);
});
