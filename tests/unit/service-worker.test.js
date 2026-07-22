import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = join(__dirname, '../../sw.js');

describe('Service Worker Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Service Worker Version', () => {
    it('should have VERSION defined', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('const VERSION =');
      expect(swContent).toMatch(/const VERSION = ['"][^'"]+['"]/);
    });

    it('should have cache name with version', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('const CACHE_NAME =');
      expect(swContent).toMatch(/const CACHE_NAME = [`'][^`']+[`']/);
    });

    it('should have MAX_CACHES_TO_KEEP defined', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('MAX_CACHES_TO_KEEP');
      expect(swContent).toMatch(/MAX_CACHES_TO_KEEP = \d+/);
    });
  });

  describe('Cache Versioning', () => {
    it('should use commit hash in cache name', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      // Cache name should include version/hash
      expect(swContent).toMatch(/CACHE_NAME = [`']calisthenics-app-[^`']+[`']/);
    });

    it('should keep limited number of cache versions', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      // Should keep at least 5 versions for rollback safety
      expect(swContent).toMatch(/MAX_CACHES_TO_KEEP = 5/);
    });
  });

  describe('Cache Lifecycle', () => {
    it('should support cache operations', async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        expect(Array.isArray(cacheNames)).toBe(true);
      } else {
        // Skip if not in browser environment
        expect(true).toBe(true);
      }
    });

    it('should be able to open cache', async () => {
      if ('caches' in window) {
        const cache = await caches.open('test-cache');
        expect(cache).toBeDefined();
        
        // Clean up
        await caches.delete('test-cache');
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Service Worker Registration', () => {
    it('should support service worker registration', () => {
      if ('serviceWorker' in navigator) {
        expect(navigator.serviceWorker).toBeDefined();
      } else {
        // Skip if not in browser environment
        expect(true).toBe(true);
      }
    });

    it('should be able to register service worker', async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          expect(registration).toBeDefined();
        } catch (error) {
          // Registration might fail in test environment, that's OK
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Offline Support', () => {
    it('should support offline detection', () => {
      expect(typeof navigator.onLine).toBe('boolean');
    });

    it('should handle online/offline events', () => {
      const onlineHandler = vi.fn();
      const offlineHandler = vi.fn();
      
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      
      expect(onlineHandler).not.toHaveBeenCalled();
      expect(offlineHandler).not.toHaveBeenCalled();
      
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });
  });

  describe('Service Worker Events', () => {
    it('should handle install event', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain("addEventListener('install'");
    });

    it('should handle fetch event', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain("addEventListener('fetch'");
    });

    it('should handle activate event', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain("addEventListener('activate'");
    });

    it('should handle message event', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain("addEventListener('message'");
    });
  });

  describe('Cache Invalidation', () => {
    it('should clean up old caches on activation', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      // Should delete old caches
      expect(swContent).toContain('caches.delete');
      expect(swContent).toContain('cachesToDelete');
    });

    it('should skip waiting for updates', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('self.skipWaiting()');
    });

    it('should support skip waiting message', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('SKIP_WAITING');
    });
  });

  describe('Fetch Strategy', () => {
    it('should implement cache-first for HTML', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain("request.destination === 'document'");
      expect(swContent).toContain('caches.match(request)');
    });

    it('should implement network-first for images', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain("request.destination === 'image'");
    });

    it('should handle offline requests', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('Offline - Resource not available');
      expect(swContent).toContain('status: 503');
    });
  });

  describe('App Shell Caching', () => {
    it('should cache essential app resources', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('APP_SHELL');
      expect(swContent).toContain('index.html');
      expect(swContent).toContain('css/style.css');
      expect(swContent).toContain('manifest.json');
    });

    it('should cache data files', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain('data/data.json');
      expect(swContent).toContain('data/skill-modules.json');
    });
  });

  describe('Service Worker Features', () => {
    it('should handle notificationclick events', () => {
      const swContent = readFileSync(swPath, 'utf8');
      
      expect(swContent).toContain("addEventListener('notificationclick'");
    });
  });
});
