/**
 * @fileoverview Test offline-first strategy implementation
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDataCache, isCacheStale, reloadCacheForLocale } from '../../js/services/data-cache.js';
import { openDatabase, STORES } from '../../js/services/database.js';

// Mock fetch to simulate offline/online scenarios
global.fetch = vi.fn();

describe('Offline-First Strategy', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear IndexedDB before each test
    if (window.indexedDB) {
      const deleteRequest = window.indexedDB.deleteDatabase('calisthenics-db');
      await new Promise((resolve, reject) => {
        deleteRequest.onsuccess = resolve;
        deleteRequest.onerror = reject;
      });
    }
  });

  it('should load data from IndexedDB when available (offline mode)', async () => {
    // Setup: Pre-populate IndexedDB with data
    const db = await openDatabase();
    
    // Store some exercises
    const exercises = [
      { id: 1, name: 'Push-Up', skill: 'Push-Up Variations' },
      { id: 2, name: 'Pull-Up', skill: 'Pull-Up Variations' }
    ];
    
    const tx = db.transaction([STORES.EXERCISES, STORES.CATEGORIES, STORES.DATA_VERSION], 'readwrite');
    const exerciseStore = tx.objectStore(STORES.EXERCISES);
    const categoryStore = tx.objectStore(STORES.CATEGORIES);
    const dataVersionStore = tx.objectStore(STORES.DATA_VERSION);
    
    exercises.forEach(ex => exerciseStore.put(ex));
    categoryStore.put({ id: 1, name: 'Chest' });
    dataVersionStore.put({ key: 'dataVersion', version: '2026-06-20T23:00:48.956Z' });
    
    await new Promise(resolve => tx.oncomplete = resolve);
    
    // Mock fetch to simulate network failure (offline)
    global.fetch.mockRejectedValue(new Error('Network failed'));
    
    // Initialize cache - should use IndexedDB instead of network
    const result = await initializeDataCache();
    
    expect(result).toBe(true);
    
    // Verify data was loaded from IndexedDB (not network)
    const state = await import('../../js/services/state.js');
    expect(state.getState().exercises).toHaveLength(2);
    expect(state.getState().exercises[0].name).toBe('Push-Up');
  });

  it('should fall back to network when IndexedDB is empty (first run)', async () => {
    // Mock fetch to return data
    const mockData = {
      exercises: [
        { id: 1, name: 'Push-Up', skill: 'Push-Up Variations' },
        { id: 2, name: 'Pull-Up', skill: 'Pull-Up Variations' }
      ],
      categories: [{ id: 1, name: 'Chest' }],
      muscles: [],
      equipment: [],
      difficulties: [],
      routines: [],
      dataVersion: '2026-06-20T23:00:48.956Z'
    };
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData
    });
    
    // Initialize cache - should fetch from network
    const result = await initializeDataCache();
    
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
    
    // Verify data was stored in IndexedDB
    const state = await import('../../js/services/state.js');
    expect(state.getState().exercises).toHaveLength(2);
  });

  it('should preserve user-added exercises when reloading from network', async () => {
    // Setup: Pre-populate IndexedDB with reference data + user exercise
    const db = await openDatabase();
    
    const referenceExercises = [
      { id: 1, name: 'Push-Up', skill: 'Push-Up Variations' },
      { id: 2, name: 'Pull-Up', skill: 'Pull-Up Variations' }
    ];
    
    const userExercise = {
      id: 999,
      name: 'My Custom Exercise',
      skill: 'Custom',
      description: 'User created exercise'
    };
    
    const tx = db.transaction([STORES.EXERCISES, STORES.CATEGORIES, STORES.DATA_VERSION], 'readwrite');
    const exerciseStore = tx.objectStore(STORES.EXERCISES);
    const categoryStore = tx.objectStore(STORES.CATEGORIES);
    const dataVersionStore = tx.objectStore(STORES.DATA_VERSION);
    
    referenceExercises.forEach(ex => exerciseStore.put(ex));
    exerciseStore.put(userExercise);
    categoryStore.put({ id: 1, name: 'Chest' });
    dataVersionStore.put({ key: 'dataVersion', version: '2026-06-20T23:00:48.956Z' });
    
    await new Promise(resolve => tx.oncomplete = resolve);
    
    // Mock fetch to return only reference data (no user exercise)
    const mockData = {
      exercises: referenceExercises,
      categories: [{ id: 1, name: 'Chest' }],
      muscles: [],
      equipment: [],
      difficulties: [],
      routines: [],
      dataVersion: '2026-06-20T23:00:48.956Z'
    };
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData
    });
    
    // Reload cache
    const result = await reloadCacheForLocale();
    
    expect(result).toBe(true);
    
    // Verify user exercise was preserved
    const state = await import('../../js/services/state.js');
    expect(state.getState().exercises).toHaveLength(3);
    const userEx = state.getState().exercises.find(e => e.id === 999);
    expect(userEx).toBeDefined();
    expect(userEx.name).toBe('My Custom Exercise');
  });

  it('should check for data updates when online', async () => {
    // Setup: Initial data version in IndexedDB
    const db = await openDatabase();
    const tx = db.transaction([STORES.DATA_VERSION], 'readwrite');
    tx.objectStore(STORES.DATA_VERSION).put({ key: 'dataVersion', version: 'v1' });
    await new Promise(resolve => tx.oncomplete = resolve);
    
    // Mock fetch to return new version
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        exercises: [],
        categories: [],
        muscles: [],
        equipment: [],
        difficulties: [],
        routines: [],
        dataVersion: 'v2' // New version
      })
    });
    
    // Check for updates
    const stale = await isCacheStale();
    
    expect(stale).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/data\.json/));
  });

  it('should handle network failure gracefully when IndexedDB has data', async () => {
    // Setup: Pre-populate IndexedDB
    const db = await openDatabase();
    const tx = db.transaction([STORES.EXERCISES, STORES.CATEGORIES, STORES.DATA_VERSION], 'readwrite');
    tx.objectStore(STORES.EXERCISES).put({ id: 1, name: 'Push-Up', skill: 'Push-Up' });
    tx.objectStore(STORES.CATEGORIES).put({ id: 1, name: 'Chest' });
    tx.objectStore(STORES.DATA_VERSION).put({ key: 'dataVersion', version: 'v1' });
    await new Promise(resolve => tx.oncomplete = resolve);
    
    // Mock network failure
    global.fetch.mockRejectedValue(new Error('Network failed'));
    
    // Initialize should still work using IndexedDB
    const result = await initializeDataCache();
    
    expect(result).toBe(true);
    const state = await import('../../js/services/state.js');
    expect(state.getState().exercises).toHaveLength(1);
  });
});
