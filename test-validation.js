// Test script for import validation
import { importUserData } from './js/services/export-import.js';

// Mock IndexedDB for testing
const mockData = {
  workouts: [],
  programs: [],
  modules: []
};

global.indexedDB = {
  open: (name, version) => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: (stores, mode) => ({
        objectStore: (name) => ({
          clear: () => ({ onerror: null }),
          put: (item) => ({ onerror: null }),
          add: (item) => ({ onerror: null }),
          get: (id) => ({ onerror: null, result: null }),
          getAll: () => ({ onerror: null, result: mockData[name === 'programs' ? 'programs' : name === 'modules' ? 'modules' : 'workouts'] }),
          createIndex: () => ({})
        }),
        oncomplete: null,
        onerror: null
      })
    }
  })
};

console.log('=== Testing Import Validation ===\n');

// Test 1: Valid data
console.log('Test 1: Valid data structure');
const validData = {
  version: '1.0',
  exportedAt: new Date().toISOString(),
  workouts: [
    {
      id: 1,
      program: { name: 'Push Day' },
      date: new Date().toISOString(),
      exercises: [
        {
          exerciseId: 101,
          exerciseName: 'Push-ups',
          targetSets: 3,
          targetReps: 10,
          actualReps: [10, 10, 8]
        }
      ]
    }
  ],
  programs: [],
  skillModules: []
};

importUserData(validData).then(result => {
  console.log('Result:', result.success ? 'PASS ✓' : 'FAIL ✗');
  if (!result.success) {
    console.log('Error:', result.error);
  }
  console.log('');

  // Test 2: Missing required field
  console.log('Test 2: Missing required workouts field');
  const missingField = {
    version: '1.0',
    exportedAt: new Date().toISOString()
  };

  return importUserData(missingField);
}).then(result => {
  console.log('Result:', !result.success ? 'PASS ✓' : 'FAIL ✗ (should have failed)');
  if (!result.success) {
    console.log('Error:', result.error);
  }
  console.log('');

  // Test 3: Invalid version
  console.log('Test 3: Invalid version');
  const invalidVersion = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    workouts: []
  };

  return importUserData(invalidVersion);
}).then(result => {
  console.log('Result:', !result.success ? 'PASS ✓' : 'FAIL ✗ (should have failed)');
  if (!result.success) {
    console.log('Error:', result.error);
  }
  console.log('');

  // Test 4: Invalid JSON
  console.log('Test 4: Invalid JSON format');
  return importUserData('not valid json');
}).then(result => {
  console.log('Result:', !result.success ? 'PASS ✓' : 'FAIL ✗ (should have failed)');
  if (!result.success) {
    console.log('Error:', result.error);
  }
  console.log('');

  // Test 5: Missing ID in workout
  console.log('Test 5: Workout missing required ID field');
  const missingId = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    workouts: [
      {
        program: { name: 'Test' },
        date: new Date().toISOString(),
        exercises: []
      }
    ]
  };

  return importUserData(missingId);
}).then(result => {
  console.log('Result:', !result.success ? 'PASS ✓' : 'FAIL ✗ (should have failed)');
  if (!result.success) {
    console.log('Error:', result.error);
  }
  console.log('');

  // Test 6: Invalid date format
  console.log('Test 6: Invalid date format');
  const invalidDate = {
    version: '1.0',
    exportedAt: 'not-a-date',
    workouts: []
  };

  return importUserData(invalidDate);
}).then(result => {
  console.log('Result:', !result.success ? 'PASS ✓' : 'FAIL ✗ (should have failed)');
  if (!result.success) {
    console.log('Error:', result.error);
  }
  console.log('');

  console.log('=== All tests completed ===');
}).catch(err => {
  console.error('Test suite error:', err);
});
