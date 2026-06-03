// Test setup file - runs before all tests
import { vi, beforeEach } from 'vitest';

// Mock window.localStorage
const localStorageMock = (() => {
  let store = {};
  
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get allItems() {
      return store;
    },
    reset() {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Mock windowIndexedDB
const indexedDBMock = (() => {
  const databases = {};
  
  return {
    open: vi.fn((name, version) => {
      if (!databases[name]) {
        databases[name] = {
          version,
          stores: {},
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null
        };
      }
      return {
        result: databases[name],
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        transaction: vi.fn((stores, mode) => ({
          objectStore: vi.fn((name) => {
            if (!databases[name].stores[name]) {
              databases[name].stores[name] = {
                data: new Map(),
                indexes: {},
                keyPath: null
              };
            }
            return databases[name].stores[name];
          }),
          oncomplete: null,
          onerror: null,
          onabort: null
        }))
      };
    }),
    deleteDatabase: vi.fn((name) => ({
      onsuccess: null,
      onerror: null
    }))
  };
})();

Object.defineProperty(global, 'indexedDB', {
  value: indexedDBMock
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Mock performance
global.performance = {
  now: vi.fn(() => Date.now())
};

// Mock console to reduce noise (optional - remove if you want to see console.logs in tests)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn()
// };

// Cleanup before each test
beforeEach(() => {
  localStorageMock.reset();
  // Clear IndexedDB mock data
  for (const dbName in indexedDBMock.open.mock.results) {
    const db = indexedDBMock.open.mock.results[dbName].value.result;
    for (const storeName in db.stores) {
      db.stores[storeName].data.clear();
    }
  }
  indexedDBMock.open.mockClear();
});
