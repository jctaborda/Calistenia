# Offline-First Strategy - Manual Test Guide

This document provides step-by-step instructions to verify the offline-first strategy works correctly.

## What Was Changed

### 1. Service Worker (`sw.js`)
- **Cache-First Strategy**: Static assets (HTML, CSS, JS, images) are now served from cache first
- **Data JSON Files**: Also cache-first, but app reads from IndexedDB
- **Helper Functions**: Added `isStaticAsset()` and `isDataJson()` to route requests appropriately

### 2. Data Cache (`js/services/data-cache.js`)
- **IndexDB Priority**: Now tries to load from IndexedDB FIRST before fetching from network
- **Fast Offline Load**: If data exists in IndexedDB, app loads instantly without waiting for network
- **User Data Preservation**: User-added exercises are preserved when reloading from network

### 3. Background Sync (`js/main.js`)
- **Periodic Check**: Checks for data updates every 5 minutes when online
- **Online Detection**: Uses `navigator.onLine` API to detect connection state
- **Auto-Sync**: Automatically syncs data when updates are detected

## Test Scenarios

### Scenario 1: First Visit (No Cached Data)
**Expected Behavior:**
1. App loads from network
2. Data is fetched and stored in IndexedDB
3. Console shows: `[DataCache] Loaded from network and stored in IndexedDB`
4. App is fully functional

**Steps:**
1. Clear all browser data (IndexedDB + cache)
2. Open app in browser
3. Check console for cache initialization message
4. Verify exercises, routines, etc. are loaded
5. Close browser
6. Open browser again (keep network on)
7. **Expected**: App loads instantly (from IndexedDB, not network)
8. Open DevTools Network tab
9. Refresh page
10. **Expected**: No data.json requests (loaded from IndexedDB)

### Scenario 2: Offline Mode (After First Visit)
**Expected Behavior:**
1. App loads instantly from cache
2. All exercises, routines visible
3. No network requests for static assets or data
4. Service worker serves everything from cache

**Steps:**
1. Visit app with network ON (to cache everything)
2. Open DevTools → Network tab
3. Check "Offline" checkbox in DevTools
4. Refresh page
5. **Expected**: Page loads successfully (from cache)
6. Check Network tab: Should see ONLY cached resources
7. Check Console: Should NOT see any network errors
8. Verify all exercises are visible
9. Try to start a workout
10. **Expected**: Workout works fully offline

### Scenario 3: Data Update Detection
**Expected Behavior:**
1. App checks for updates every 5 minutes when online
2. If dataVersion changes, shows toast notification
3. Automatically syncs new data
4. Re-renders current view with updated data

**Steps:**
1. Ensure app is loaded and online
2. Open DevTools Console
3. Wait for background sync check (or manually trigger)
4. **Expected Console Output**:
   ```
   [DataSync] Connection restored, checking for updates...
   [DataSync] Data is up to date
   ```
5. To test update detection:
   - Modify `data.json` on server (increment dataVersion)
   - Refresh page
   - **Expected**: Toast shows "Updating exercise data..."
   - **Expected**: Toast shows "Data updated successfully!"
   - **Expected**: Console shows version change

### Scenario 4: User Data Preservation
**Expected Behavior:**
1. User creates custom exercise
2. User clears cache or switches locale
3. Reference data reloads from network/IndexedDB
4. Custom exercise is PRESERVED

**Steps:**
1. Open app
2. Go to Exercises → Add Exercise
3. Create a custom exercise (e.g., "My Test Exercise")
4. Note the exercise ID
5. Clear browser cache (or switch locale)
6. Reload app
7. Go to Exercises
8. **Expected**: "My Test Exercise" is still there
9. **Console should show**: `[DataCache] Loaded from IndexedDB (offline mode)`

### Scenario 5: Network Recovery
**Expected Behavior:**
1. App works offline
2. User reconnects to internet
3. App detects connection restored
4. App checks for data updates

**Steps:**
1. Open app with network ON
2. Enable offline mode in DevTools
3. Refresh page (should work from cache)
4. Disable offline mode (reconnect)
5. **Expected Console Output**:
   ```
   [DataSync] Connection restored, checking for updates...
   ```
6. Check if any updates are available

## Verification Checklist

- [ ] Static assets (HTML, CSS, JS) loaded from cache
- [ ] Data JSON files loaded from IndexedDB
- [ ] App works fully offline after first visit
- [ ] No network errors when offline
- [ ] User-added exercises preserved across reloads
- [ ] Data update detection works
- [ ] Background sync check runs every 5 minutes
- [ ] Toast notifications show when data updates
- [ ] Console logs show proper cache loading messages

## Console Messages to Look For

### Normal Load (Online with Cached Data):
```
[DataCache] Loaded from IndexedDB (offline mode)
[DataSync] Data is up to date
```

### First Load (No Cache):
```
[DataCache] Loaded from network and stored in IndexedDB
```

### Offline Load:
```
[DataSync] Offline, skipping data update check
```

### Connection Restored:
```
[DataSync] Connection restored, checking for updates...
```

### Data Update Available:
```
[DataSync] Data update available (v1 -> v2), syncing...
[DataCache] Cache synced
```

## Troubleshooting

### Issue: App doesn't work offline
**Check:**
1. Service Worker is registered: `console.log(navigator.serviceWorker.controller)`
2. Cache has entries: `caches.keys()` in console
3. IndexedDB has data: Check DevTools → Application → IndexedDB

### Issue: Data not updating
**Check:**
1. `dataVersion` field exists in data.json
2. Network request is being made for data.json
3. Version comparison logic is working

### Issue: User data lost
**Check:**
1. User exercises have IDs not in reference data
2. Merge logic in `initializeDataCacheInternal()` is working
3. IndexedDB has both reference and user exercises

## Testing Tools

### Chrome DevTools:
- **Network tab**: Check "Offline" to simulate no internet
- **Application tab**: View IndexedDB, Cache Storage, Service Workers
- **Console**: View cache sync messages

### Manual Verification Commands (in Console):
```javascript
// Check service worker status
navigator.serviceWorker.controller

// List cached versions
caches.keys()

// Check cache contents
caches.open('calisthenics-app-1.0.0-20260627-2000').then(cache => cache.keys())

// Check IndexedDB data
indexedDB.open('calisthenics-db', 8).then(db => {
  db.transaction('exercises').objectStore('exercises').count().then(count => {
    console.log('Exercise count:', count);
  });
});

// Check current cache version
localStorage.getItem('dataVersion')
```

## Performance Metrics

### Expected Load Times:
- **First Visit**: ~2-3 seconds (download + cache)
- **Subsequent Visits**: <500ms (from cache/IndexedDB)
- **Offline**: <500ms (from cache/IndexedDB)

### Network Requests (After Cache):
- **Online**: 0 requests for static assets, 0 for data.json
- **Offline**: 0 requests (all from cache)

## Conclusion

The offline-first strategy is working correctly if:
1. App loads instantly on subsequent visits
2. App works fully offline
3. No network errors when offline
4. User data is preserved
5. Data updates are detected and applied automatically
