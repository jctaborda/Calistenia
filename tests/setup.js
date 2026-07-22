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

// Mock IndexedDB with proper structure and event firing
const indexedDBMock = (() => {
  const databases = {};

  /**
   * Create a mock IDBRequest that fires onsuccess/onerror asynchronously.
   */
  function createRequest(result, shouldError = false) {
    const req = {
      result: undefined,
      error: null,
      readyState: 0,
      onsuccess: null,
      onerror: null,
      oncomplete: null
    };

    // Fire asynchronously so callers can set handlers first
    setTimeout(() => {
      if (shouldError) {
        req.readyState = 2;
        if (req.onerror) req.onerror({ target: req });
      } else {
        req.readyState = 2;
        req.result = result;
        if (req.onsuccess) req.onsuccess({ target: req });
      }
    }, 0);

    return req;
  }

  /**
   * Create a mock objectStore backed by a Map.
   */
  function createObjectStore(name, storeDef) {
    const store = {
      keyPath: storeDef?.keyPath || null,
      autoIncrement: storeDef?.autoIncrement || false,
      _data: new Map(),
      _indexes: {},

      put(value, explicitKey) {
        const key = explicitKey !== undefined
          ? explicitKey
          : (store.keyPath ? value[store.keyPath] : undefined);
        store._data.set(String(key), structuredClone(value));
        return createRequest(key);
      },

      get(key) {
        return createRequest(store._data.get(String(key)) || undefined);
      },

      getAll() {
        return createRequest([...store._data.values()]);
      },

      delete(key) {
        store._data.delete(String(key));
        return createRequest(undefined);
      },

      clear() {
        store._data.clear();
        return createRequest(undefined);
      },

      count() {
        return createRequest(store._data.size);
      },

      createIndex() { /* no-op in mock */ },
      index() {
        return { openCursor: () => createRequest(null) };
      },
      openCursor() {
        return createRequest(null);
      }
    };

    return store;
  }

  /**
   * Create a mock IDBTransaction that auto-fires oncomplete after
   * the caller has had a chance to set handlers.
   */
  function createTransaction(storeNames, mode, db) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = {
      mode,
      db,
      error: null,
      oncomplete: null,
      onerror: null,
      onabort: null,
      objectStore(name) {
        if (!db._stores[name]) {
          db._stores[name] = { data: new Map(), keyPath: null, autoIncrement: false };
        }
        return db._stores[name]._mockStore || createObjectStore(name, db._stores[name]);
      }
    };

    // Fire oncomplete asynchronously so the caller can set transaction.oncomplete
    // before it fires. We defer two ticks: one for the caller to finish queuing
    // puts/clears, and one for them to set transaction.oncomplete.
    setTimeout(() => {
      // Give the caller another micro-task to set transaction.oncomplete
      setTimeout(() => {
        if (tx.oncomplete) tx.oncomplete({ target: tx });
      }, 0);
    }, 0);

    return tx;
  }

  return {
    open: vi.fn((name, version) => {
      if (!databases[name]) {
        // Start with empty objectStoreNames - onupgradeneeded will populate them
        const storeNamesSet = new Set();
        const objectStoreNames = {
          contains(name) { return storeNamesSet.has(name); },
          add(name) { storeNamesSet.add(name); },
          delete(name) { storeNamesSet.delete(name); },
          get length() { return storeNamesSet.size; },
          [Symbol.iterator]() { return storeNamesSet[Symbol.iterator](); }
        };

        const dbObj = {
          name,
          version,
          objectStoreNames,
          _stores: {},
          createObjectStore(storeName, options = {}) {
            const storeDef = {
              keyPath: options.keyPath || null,
              autoIncrement: options.autoIncrement || false,
              _data: new Map()
            };
            const mockStore = createObjectStore(storeName, storeDef);
            dbObj._stores[storeName] = { ...storeDef, _mockStore: mockStore };
            dbObj.objectStoreNames.add(storeName);
            return mockStore;
          },
          deleteObjectStore(storeName) {
            dbObj.objectStoreNames.delete(storeName);
            delete dbObj._stores[storeName];
          },
          transaction(storeNames, mode) {
            return createTransaction(storeNames, mode, dbObj);
          },
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null
        };
        databases[name] = dbObj;
      }

      const dbObj = databases[name];
      let upgradeFired = false;

      const request = {
        result: null,
        error: null,
        readyState: 0,
        _onupgradeneeded: null,
        _onsuccess: null,
        _onerror: null
      };

      // Return a proxy so callers can set onupgradeneeded / onsuccess / onerror
      // and the events fire in the correct order.
      return {
        set onupgradeneeded(fn) {
          request._onupgradeneeded = fn;
          // Fire upgrade synchronously once the handler is assigned (mirrors real IDB)
          if (!upgradeFired && fn) {
            upgradeFired = true;
            fn({ target: { result: dbObj } });
          }
        },
        get onupgradeneeded() { return request._onupgradeneeded; },

        set onsuccess(fn) {
          request._onsuccess = fn;
          // Fire success asynchronously after upgrade (if any) is done
          if (fn) {
            setTimeout(() => {
              request.readyState = 2;
              request.result = dbObj;
              fn({ target: request });
            }, 0);
          }
        },
        get onsuccess() { return request._onsuccess; },

        set onerror(fn) { request._onerror = fn; },
        get onerror() { return request._onerror; },
        get result() { return request.result; },
        get error() { return request.error; }
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
  for (const dbName in indexedDBMock.databases) {
    const db = indexedDBMock.databases[dbName];
    if (db && db._stores) {
      for (const storeName in db._stores) {
        const storeDef = db._stores[storeName];
        // Clear the actual data store (_mockStore._data is where put/getAll read/write)
        if (storeDef && storeDef._mockStore && storeDef._mockStore._data) {
          storeDef._mockStore._data.clear();
        }
      }
    }
  }
  indexedDBMock.open.mockClear();
});
