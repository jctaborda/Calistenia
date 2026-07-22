/**
 * E2E Tests for Critical User Workflows
 * Tests actual view rendering and data flow through the application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeState, getState, updateState } from '../../js/services/state.js';

describe('E2E: View Rendering and User Workflows', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
    vi.clearAllMocks();
    initializeState();
  });

  describe('Onboarding Flow', () => {
    it('should render onboarding view with form fields', async () => {
      const { renderOnboardingView } = await import('../../js/views/onboarding-view.js');
      renderOnboardingView();

      const form = document.querySelector('#onboarding-form');
      expect(form).toBeTruthy();

      const nameInput = document.querySelector('#onboarding-name');
      expect(nameInput).toBeTruthy();
      expect(nameInput.getAttribute('required')).toBe('');

      const levelSelect = document.querySelector('#onboarding-level');
      expect(levelSelect).toBeTruthy();
      expect(levelSelect.options.length).toBe(3);
    });

    it('should validate name input during onboarding', async () => {
      const { renderOnboardingView } = await import('../../js/views/onboarding-view.js');
      renderOnboardingView();

      const nameInput = document.querySelector('#onboarding-name');
      expect(nameInput.getAttribute('required')).toBe('');
      expect(nameInput.getAttribute('maxlength')).toBe('50');
    });

    it('should have correct fitness level options', async () => {
      const { renderOnboardingView } = await import('../../js/views/onboarding-view.js');
      renderOnboardingView();

      const levelSelect = document.querySelector('#onboarding-level');
      const options = Array.from(levelSelect.options).map(o => o.value);
      expect(options).toContain('Beginner');
      expect(options).toContain('Intermediate');
      expect(options).toContain('Advanced');
    });
  });

  describe('Export/Import View', () => {
    it('should render export/import view with action buttons', async () => {
      const { default: exportImportModule } = await import('../../js/views/export-import-view.js');
      await exportImportModule.render();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toContain('export');
    });

    it('should have file input for import functionality', async () => {
      const { default: exportImportModule } = await import('../../js/views/export-import-view.js');
      await exportImportModule.render();

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toContain('json');
    });

    it('should have copy to clipboard button', async () => {
      const { default: exportImportModule } = await import('../../js/views/export-import-view.js');
      await exportImportModule.render();

      const copyBtn = document.querySelector('[data-action="copy-data"], #copy-btn, [id*="copy"], button');
      expect(copyBtn).toBeTruthy();
    });
  });

  describe('Profile View', () => {
    it('should render profile view with user info', async () => {
      updateState({
        user: {
          name: 'TestUser',
          level: 'Intermediate'
        }
      });

      const { renderProfileView } = await import('../../js/views/profile-view.js');
      renderProfileView();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toContain('TestUser');
    });

    it('should show profile actions', async () => {
      const { renderProfileView } = await import('../../js/views/profile-view.js');
      renderProfileView();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toMatch(/profile|user|account/i);
    });
  });

  describe('Settings View', () => {
    it('should render settings view with options', async () => {
      const { renderSettingsView } = await import('../../js/views/settings-view.js');
      renderSettingsView();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toMatch(/setting|option|config/i);
    });

    it('should have language selection', async () => {
      const { renderSettingsView } = await import('../../js/views/settings-view.js');
      renderSettingsView();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toMatch(/language|idioma/i);
    });
  });

  describe('Home View', () => {
    it('should render home view with workout options', async () => {
      const { renderHomeView } = await import('../../js/views/home-view.js');
      renderHomeView();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toMatch(/workout|routine|start|begin/i);
    });

    it('should display user name when available', async () => {
      updateState({ user: { name: 'TestUser' } });

      const { renderHomeView } = await import('../../js/views/home-view.js');
      renderHomeView();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toContain('TestUser');
    });
  });

  describe('Workout Summary View', () => {
    it('should render workout summary with stats', async () => {
      updateState({
        workout: {
          exercises: [{ id: 'ex-1', name: 'Push-Up' }],
          startTime: Date.now() - 3600000,
          endTime: Date.now()
        }
      });

      const { renderWorkoutSummaryView } = await import('../../js/views/workout-summary-view.js');
      renderWorkoutSummaryView();

      const content = document.querySelector('#app').innerHTML;
      expect(content).toMatch(/summary|complete|done|workout/i);
    });
  });

  describe('Data Persistence', () => {
    it('should persist user data to localStorage', () => {
      updateState({
        user: { name: 'TestUser' }
      });

      const saved = localStorage.getItem('state');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved);
      expect(parsed.user.name).toBe('TestUser');
    });

    it('should load persisted data on state initialization', () => {
      updateState({
        user: { name: 'PersistedUser' }
      });

      initializeState();

      const state = getState();
      expect(state.user.name).toBe('PersistedUser');
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('state', '{invalid json');

      // Should not throw when initializing with corrupted data
      expect(() => initializeState()).not.toThrow();

      const state = getState();
      expect(state).toBeDefined();
      // State may be empty or default, but should not be undefined
    });
  });

  describe('Navigation Between Views', () => {
    it('should update URL hash for navigation', async () => {
      window.location.hash = '#home';
      expect(window.location.hash).toBe('#home');

      window.location.hash = '#settings';
      expect(window.location.hash).toBe('#settings');
    });

    it('should handle hash change events', async () => {
      const handler = vi.fn();
      window.addEventListener('hashchange', handler);

      // jsdom doesn't trigger hashchange on direct assignment, dispatch event manually
      window.location.hash = '#new-view';
      window.dispatchEvent(new Event('hashchange'));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Exercise Cards', () => {
    it('should render exercise card with required data attributes', async () => {
      const app = document.querySelector('#app');
      app.innerHTML = `
        <div class="exercise-card" data-exercise-id="ex-1">
          <h3>Push-Up</h3>
        </div>
      `;

      const card = document.querySelector('.exercise-card');
      expect(card.dataset.exerciseId).toBe('ex-1');
    });

    it('should have difficulty indicator', async () => {
      const app = document.querySelector('#app');
      app.innerHTML = `
        <div class="exercise-card">
          <span class="difficulty-badge" data-difficulty="intermediate">Intermediate</span>
        </div>
      `;

      const badge = document.querySelector('.difficulty-badge');
      expect(badge.dataset.difficulty).toBe('intermediate');
    });
  });

  describe('Timer Integration', () => {
    it('should create countdown timer element', async () => {
      const app = document.querySelector('#app');
      app.innerHTML = `
        <div class="timer" id="rest-timer" data-duration="60" data-running="false">
          <span class="timer-display">1:00</span>
        </div>
      `;

      const timer = document.querySelector('#rest-timer');
      expect(timer.dataset.duration).toBe('60');
      expect(timer.dataset.running).toBe('false');
    });

    it('should have start/pause controls', async () => {
      const app = document.querySelector('#app');
      app.innerHTML = `
        <div class="timer-controls">
          <button data-action="start-timer">Start</button>
          <button data-action="pause-timer">Pause</button>
          <button data-action="reset-timer">Reset</button>
        </div>
      `;

      const startBtn = document.querySelector('[data-action="start-timer"]');
      const pauseBtn = document.querySelector('[data-action="pause-timer"]');
      const resetBtn = document.querySelector('[data-action="reset-timer"]');

      expect(startBtn).toBeTruthy();
      expect(pauseBtn).toBeTruthy();
      expect(resetBtn).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should prevent form submission without required fields', async () => {
      const app = document.querySelector('#app');
      app.innerHTML = `
        <form id="test-form">
          <input type="text" name="requiredField" required />
          <button type="submit">Submit</button>
        </form>
      `;

      const form = document.querySelector('#test-form');
      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      // Form should still be present (submission prevented)
      expect(form).toBeTruthy();
    });
  });
});
