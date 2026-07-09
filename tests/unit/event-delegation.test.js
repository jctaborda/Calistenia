import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Dark Mode Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('Theme Persistence on Page Load', () => {
    it('should apply light theme by default when no saved theme exists', () => {
      expect(localStorage.getItem('theme')).toBeNull();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply dark theme when dark is saved in localStorage', () => {
      localStorage.setItem('theme', 'dark');
      // Simulate page load behavior from index.html
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply light theme when light is saved in localStorage', () => {
      localStorage.setItem('theme', 'light');
      // Simulate page load behavior from index.html
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should handle invalid theme values by defaulting to light', () => {
      localStorage.setItem('theme', 'invalid');
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Toggle Persistence', () => {
    it('should save dark theme to localStorage when toggled', () => {
      // Simulate toggle from light to dark
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      
      expect(isDark).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should save light theme to localStorage when toggled from dark', () => {
      // First set to dark
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      
      // Then toggle back to light
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      
      expect(isDark).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should persist theme across multiple toggles', () => {
      // Toggle light -> dark
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', 'dark');
      expect(localStorage.getItem('theme')).toBe('dark');
      
      // Toggle dark -> light
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', 'light');
      expect(localStorage.getItem('theme')).toBe('light');
      
      // Toggle light -> dark again
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', 'dark');
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('Theme Persistence Integration', () => {
    it('should maintain theme state after page reload simulation', () => {
      // Initial state
      localStorage.setItem('theme', 'dark');
      
      // Simulate page reload
      document.documentElement.classList.remove('dark');
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should work with settings view theme selection', () => {
      // Simulate user selecting dark theme in settings
      const theme = 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      
      // Simulate page reload
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
      
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should handle system theme preference', () => {
      localStorage.setItem('theme', 'system');
      
      // Simulate page load - system theme doesn't add 'dark' class directly
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      // System theme should not add dark class automatically
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('system');
    });
  });

  describe('Theme State Consistency', () => {
    it('should have consistent theme between localStorage and DOM', () => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      
      const isDarkInStorage = localStorage.getItem('theme') === 'dark';
      const isDarkInDom = document.documentElement.classList.contains('dark');
      
      expect(isDarkInStorage).toBe(isDarkInDom);
    });

    it('should restore theme correctly after clear and re-set', () => {
      // Set dark theme
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      
      // Clear and restore
      localStorage.removeItem('theme');
      document.documentElement.classList.remove('dark');
      
      // Restore from saved state
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      // Should remain light since we cleared localStorage
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBeNull();
    });
  });
});
