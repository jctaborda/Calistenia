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

// Mock IndexedDB with proper structure
const indexedDBMock = (() => {
  const databases = {};
  
  return {
    open: vi.fn((name, version) => {
      if (!databases[name]) {
        databases[name] = {
          name,
          version,
          objectStoreNames: new Set(['exercises', 'workouts', 'modules', 'routines', 'state', 'deleted_items']),
          stores: {
            exercises: { data: new Map(), indexes: {}, keyPath: 'id', autoIncrement: false },
            workouts: { data: new Map(), indexes: {}, keyPath: 'id', autoIncrement: false },
            modules: { data: new Map(), indexes: {}, keyPath: 'id', autoIncrement: false },
            routines: { data: new Map(), indexes: {}, keyPath: 'id', autoIncrement: false },
            state: { data: new Map(), indexes: {}, keyPath: 'id', autoIncrement: false },
            deleted_items: { data: new Map(), indexes: {}, keyPath: 'id', autoIncrement: false }
          },
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null
        };
      }
      
      const db = databases[name];
      
      return {
        result: db,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        objectStoreNames: db.objectStoreNames,
        transaction: vi.fn((stores, mode) => {
          const storeNames = Array.isArray(stores) ? stores : [stores];
          return {
            objectStore: vi.fn((storeName) => {
              if (!db.stores[storeName]) {
                db.stores[storeName] = {
                  data: new Map(),
                  indexes: {},
                  keyPath: 'id',
                  autoIncrement: false
                };
              }
              return db.stores[storeName];
            }),
            oncomplete: null,
            onerror: null,
            onabort: null,
            mode
          };
        }),
        deleteDatabase: vi.fn((dbName) => ({
          onsuccess: null,
          onerror: null
        }))
      };
    }),
    deleteDatabase: vi.fn((name) => {
      if (databases[name]) {
        delete databases[name];
      }
      return {
        onsuccess: null,
        onerror: null
      };
    }),
    get databases() {
      return databases;
    }
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

// Mock File and Blob for FileReader tests
class MockBlob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
  }
  
  slice(start, end) {
    return new MockBlob(this.parts.slice(start, end), { type: this.type });
  }
}

// Use native Blob if available, otherwise use MockBlob
if (typeof Blob === 'undefined') {
  global.Blob = MockBlob;
}

// Export MockBlob for use in tests
global.MockBlob = MockBlob;

class MockFileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 0; // EMPTY
    this.onload = null;
    this.onerror = null;
    this.onprogress = null;
  }
  
  async readAsText(blob) {
    this.readyState = 1; // LOADING
    
    try {
      let textContent;
      
      // Handle MockBlob
      if (blob instanceof MockBlob) {
        textContent = blob.parts ? blob.parts.join('') : 'mock content';
      }
      // Handle native Blob - use TextDecoder to read
      else if (typeof Blob !== 'undefined' && blob instanceof Blob) {
        // In Node.js, we can't directly read Blob contents without async
        // For testing purposes, we'll extract from blob's internal structure
        if (blob._text) {
          textContent = blob._text;
        } else if (blob.arrayBuffer) {
          // Simulate reading a Blob - just return a marker
          textContent = '[Blob contents]';
        } else {
          textContent = 'mock content';
        }
      }
      // Handle MockFileReader's own blob format
      else if (blob && typeof blob.slice === 'function') {
        textContent = blob.parts ? blob.parts.join('') : 'mock content';
      }
      else {
        throw new Error('Invalid blob');
      }
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      this.result = textContent;
      if (this.onload) {
        this.onload({ target: this });
      }
      this.readyState = 2; // DONE;
    } catch (err) {
      this.error = err;
      if (this.onerror) {
        this.onerror({ target: this });
      }
      this.readyState = 2;
    }
  }
}

global.FileReader = MockFileReader;

// Cleanup before each test
beforeEach(() => {
  localStorageMock.reset();
  // Clear IndexedDB mock data
  for (const dbName in indexedDBMock.open.mock.results) {
    const db = indexedDBMock.open.mock.results[dbName].value.result;
    if (db && db.stores) {
      for (const storeName in db.stores) {
        db.stores[storeName].data.clear();
      }
    }
  }
  indexedDBMock.open.mockClear();
});
