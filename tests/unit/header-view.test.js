import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHeader } from '../../js/components/header.js';
import { setLocale, getLocale } from '../../js/i18n.js';

describe('Header View', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
    // Reset locale to English
    localStorage.setItem('locale', 'en');
  });

  describe('renderHeader', () => {
    it('should return valid HTML string', () => {
      const html = renderHeader();
      expect(typeof html).toBe('string');
      expect(html).toContain('id="app-header"');
      expect(html).toContain('Calisthenics Mastery');
    });

    it('should include theme toggle button', () => {
      const html = renderHeader();
      expect(html).toContain('id="theme-toggle"');
      expect(html).toContain('aria-label="Toggle dark mode"');
    });

    it('should include locale toggle button', () => {
      const html = renderHeader();
      expect(html).toContain('id="locale-toggle"');
      expect(html).toContain('aria-label="Toggle language"');
    });

    it('should include all navigation links', () => {
      const html = renderHeader();
      expect(html).toContain('href="#home"');
      expect(html).toContain('href="#routines"');
      expect(html).toContain('href="#exercises"');
      expect(html).toContain('href="#skill-modules"');
      expect(html).toContain('href="#profile"');
    });

    it('should display correct theme icon based on current theme', () => {
      // Default to light mode
      const html = renderHeader();
      expect(html).toContain('🌙 Dark'); // Should show "Dark" option when in light mode
      
      // Simulate dark mode
      document.documentElement.classList.add('dark');
      const darkHtml = renderHeader();
      expect(darkHtml).toContain('☀️ Light'); // Should show "Light" option when in dark mode
    });

    it('should display next locale correctly', () => {
      const html = renderHeader();
      // Should contain locale toggle with language code
      expect(html).toMatch(/🌐 [A-Z]{2}/);
    });

    it('should handle locale changes', () => {
      // Set to Spanish
      setLocale('es');
      const html = renderHeader();
      expect(html).toContain('EN'); // Should show next locale (English)
      
      // Set back to English
      setLocale('en');
      const html2 = renderHeader();
      expect(html2).toContain('ES'); // Should show next locale (Spanish)
    });

    it('should include logo icon', () => {
      const html = renderHeader();
      expect(html).toContain('💪');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="logo"');
    });

    it('should be accessible with proper ARIA labels', () => {
      const html = renderHeader();
      expect(html).toContain('aria-label="Toggle dark mode"');
      expect(html).toContain('aria-label="Toggle language"');
    });

    it('should handle missing translations gracefully', () => {
      const html = renderHeader();
      expect(html).toBeTruthy();
      expect(html.length).toBeGreaterThan(100);
    });
  });

  describe('Header Accessibility', () => {
    it('should have proper semantic structure', () => {
      const html = renderHeader();
      expect(html).toContain('<header');
      expect(html).toContain('<nav');
      expect(html).toContain('<a');
    });

    it('should include logo with proper accessibility', () => {
      const html = renderHeader();
      expect(html).toContain('logo-icon');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="logo"');
    });

    it('should have buttons with proper labels', () => {
      const html = renderHeader();
      expect(html).toContain('aria-label="Toggle dark mode"');
      expect(html).toContain('aria-label="Toggle language"');
    });
  });

  describe('Header Content', () => {
    it('should include app title', () => {
      const html = renderHeader();
      expect(html).toContain('Calisthenics Mastery');
    });

    it('should have flex container for header controls', () => {
      const html = renderHeader();
      expect(html).toContain('class="header-controls"');
      expect(html).toContain('class="flex-container"');
    });

    it('should have navigation in secondary container', () => {
      const html = renderHeader();
      expect(html).toContain('class="flex-container"');
      expect(html).match(/<nav[^>]*aria-label="Main navigation"/);
    });
  });
});
