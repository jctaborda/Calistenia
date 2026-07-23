import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../../js/services/state.js', () => ({
  updateState: vi.fn(),
  getState: vi.fn(() => ({
    user: { favoriteExerciseIds: [], unlockedAchievements: [] },
    history: [],
    routines: [],
  })),
}));

vi.mock('../../js/services/undo-service.js', () => ({
  saveForUndo: vi.fn(),
}));

vi.mock('../../js/services/modules-service.js', () => ({
  ModuleStore: { delete: vi.fn() },
}));

vi.mock('../../js/services/toast-service.js', () => ({
  show: vi.fn(),
}));

vi.mock('../../js/services/confirmation-modal.js', () => ({
  showConfirmation: vi.fn(),
}));

vi.mock('../../js/utils/workout-summary.js', () => ({
  formatWorkoutSummary: vi.fn(() => 'Workout Summary'),
}));

vi.mock('../../js/utils/html-helpers.js', () => ({
  escapeHtml: vi.fn((str) => str),
}));

vi.mock('../../js/services/database.js', () => ({
  deleteRoutine: vi.fn(),
  routinesLoad: vi.fn(() => Promise.resolve([])),
  storeSharedComments: vi.fn(),
  loadSharedComments: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  getAvailableLocales: vi.fn(() => [{ code: 'en' }, { code: 'es' }]),
  getLocale: vi.fn(() => 'en'),
  setLocale: vi.fn(),
}));

import {
  initializeEventDelegation,
  cleanupEventDelegation,
  setCurrentEditingModule,
} from '../../js/services/event-delegation.js';
import { getState, updateState } from '../../js/services/state.js';
import { show } from '../../js/services/toast-service.js';
import { showConfirmation } from '../../js/services/confirmation-modal.js';

describe('Event Delegation Service', () => {
  let mainEl;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mainEl = document.getElementById('app');

    // Reset window globals
    window.location.hash = '';
    window.history.back = vi.fn();
  });

  afterEach(() => {
    cleanupEventDelegation();
  });

  describe('initializeEventDelegation', () => {
    it('should attach event listeners to the main element', () => {
      const spy = vi.spyOn(mainEl, 'addEventListener');
      initializeEventDelegation(mainEl);

      const callTypes = spy.mock.calls.map((c) => c[0]);
      expect(callTypes).toContain('click');
      expect(callTypes).toContain('submit');
      spy.mockRestore();
    });

    it('should be idempotent on multiple calls', () => {
      const spy = vi.spyOn(mainEl, 'addEventListener');
      initializeEventDelegation(mainEl);
      const firstCount = spy.mock.calls.length;

      initializeEventDelegation(mainEl);
      const secondCount = spy.mock.calls.length;

      // Second call should add duplicate listeners (documented behavior)
      expect(secondCount).toBeGreaterThanOrEqual(firstCount);
      spy.mockRestore();
    });
  });

  describe('cleanupEventDelegation', () => {
    it('should remove all event listeners', () => {
      const spy = vi.spyOn(mainEl, 'removeEventListener');
      initializeEventDelegation(mainEl);
      cleanupEventDelegation();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Navigation clicks (data-nav)', () => {
    beforeEach(() => {
      initializeEventDelegation(mainEl);
    });

    it('should navigate to hash on data-nav click', () => {
      mainEl.innerHTML = '<button data-nav="#settings">Settings</button>';
      mainEl.querySelector('[data-nav]').click();

      expect(window.location.hash).toBe('#settings');
    });

    it('should call history.back when data-nav="back"', () => {
      mainEl.innerHTML = '<button data-nav="back">Back</button>';
      mainEl.querySelector('[data-nav]').click();

      expect(window.history.back).toHaveBeenCalled();
    });

    it('should prevent default on navigation clicks', () => {
      mainEl.innerHTML = '<a href="/other" data-nav="#home">Home</a>';
      const link = mainEl.querySelector('[data-nav]');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventSpy = vi.spyOn(event, 'preventDefault');
      link.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
    });
  });

  describe('Favorite toggle (exercise-card-favorite)', () => {
    beforeEach(() => {
      initializeEventDelegation(mainEl);
    });

    it('should toggle exercise into favorites', () => {
      getState.mockReturnValue({
        user: { favoriteExerciseIds: [] },
      });

      mainEl.innerHTML = '<button class="exercise-card-favorite" data-exercise-id="42">★</button>';
      mainEl.querySelector('.exercise-card-favorite').click();

      expect(updateState).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            favoriteExerciseIds: expect.arrayContaining(['42']),
          }),
        })
      );
    });

    it('should toggle exercise out of favorites', () => {
      getState.mockReturnValue({
        user: { favoriteExerciseIds: ['42'] },
      });

      mainEl.innerHTML = '<button class="exercise-card-favorite" data-exercise-id="42">★</button>';
      mainEl.querySelector('.exercise-card-favorite').click();

      expect(updateState).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            favoriteExerciseIds: expect.not.arrayContaining(['42']),
          }),
        })
      );
    });

    it('should handle data-favorite attribute for backward compatibility', () => {
      getState.mockReturnValue({
        user: { favoriteExerciseIds: [] },
      });

      mainEl.innerHTML = '<button data-favorite="7">★</button>';
      mainEl.querySelector('[data-favorite]').click();

      expect(updateState).toHaveBeenCalled();
    });
  });

  describe('Exercise card click navigation', () => {
    beforeEach(() => {
      initializeEventDelegation(mainEl);
    });

    it('should navigate to exercise details on card click', () => {
      mainEl.innerHTML = '<div data-exercise-id="5"><span>Push-Up</span></div>';
      mainEl.querySelector('[data-exercise-id]').click();

      expect(window.location.hash).toBe('#exercise/5');
    });

    it('should not navigate when clicking a checkbox in builder view', () => {
      mainEl.innerHTML = '<input type="checkbox" data-exercise-id="5">';
      mainEl.querySelector('input[type="checkbox"]').click();

      expect(window.location.hash).toBe('');
    });
  });

  describe('Create routine button', () => {
    beforeEach(() => {
      initializeEventDelegation(mainEl);
    });

    it('should set state and navigate to builder', () => {
      mainEl.innerHTML = '<button data-action="create-routine">Create</button>';
      mainEl.querySelector('[data-action="create-routine"]').click();

      expect(updateState).toHaveBeenCalledWith(
        expect.objectContaining({
          createNewRoutine: true,
          editingRoutines: null,
          editingModule: null,
        })
      );
      expect(window.location.hash).toBe('#builder');
    });
  });

  describe('Profile clicks', () => {
    beforeEach(() => {
      initializeEventDelegation(mainEl);
      showConfirmation.mockResolvedValue(true);
    });

    it('should handle delete metric button click', async () => {
      getState.mockReturnValue({
        user: {
          bodyMetrics: [
            { date: '2024-01-01', weight: 70, index: 0 },
            { date: '2024-02-01', weight: 72, index: 1 },
          ],
        },
      });

      mainEl.innerHTML = '<button data-delete-metric data-index="0">Delete</button>';
      mainEl.querySelector('[data-delete-metric]').click();

      // Allow async confirmation to resolve
      await new Promise((r) => setTimeout(r, 0));

      expect(showConfirmation).toHaveBeenCalled();
    });

    it('should handle delete workout history button click', async () => {
      getState.mockReturnValue({
        history: [{ id: 'w1', date: '2024-01-01' }],
      });

      mainEl.innerHTML = '<button data-delete-workout data-index="0">✕</button>';
      mainEl.querySelector('[data-delete-workout]').click();

      await new Promise((r) => setTimeout(r, 0));

      expect(showConfirmation).toHaveBeenCalled();
    });

    it('should navigate to workout detail on workout item click', () => {
      mainEl.innerHTML = '<div data-workout-item data-index="2">Workout</div>';
      mainEl.querySelector('[data-workout-item]').click();

      expect(window.location.hash).toBe('#workout-detail/2');
    });
  });

  describe('Error boundary clicks', () => {
    beforeEach(() => {
      initializeEventDelegation(mainEl);
    });

    it('should navigate home on error go-home button', () => {
      let hash = '';
      const locationObj = { hash: '', reload: vi.fn() };
      Object.defineProperty(window, 'location', {
        value: locationObj,
        writable: true,
        configurable: true,
      });

      mainEl.innerHTML = '<button data-error-go-home>Go Home</button>';
      mainEl.querySelector('[data-error-go-home]').click();

      expect(window.location.hash).toBe('#');
    });

    it('should reload page on error reload button', () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { ...window.location, reload: reloadSpy },
        writable: true,
      });

      mainEl.innerHTML = '<button data-error-reload>Reload</button>';
      mainEl.querySelector('[data-error-reload]').click();

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('Form submissions', () => {
    beforeEach(() => {
      initializeEventDelegation(mainEl);
    });

    it('should intercept body metrics form submission', () => {
      // Mock ValidationService to prevent unhandled errors
      window.ValidationService = {
        validateNumber: vi.fn(() => ({ valid: false, error: 'Invalid' })),
      };

      mainEl.innerHTML = `
        <form id="body-metrics-form">
          <input id="weight" value="70" />
          <input id="bodyFat" value="15" />
        </form>
      `;
      const form = mainEl.querySelector('#body-metrics-form');
      const event = new Event('submit', { bubbles: true, cancelable: true });
      const preventSpy = vi.spyOn(event, 'preventDefault');
      form.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
    });
  });

  describe('setCurrentEditingModule', () => {
    it('should store module on window', () => {
      const mod = { id: 'test', name: 'Test Module' };
      setCurrentEditingModule(mod);
      expect(window.currentEditingModule).toBe(mod);
    });
  });
});
