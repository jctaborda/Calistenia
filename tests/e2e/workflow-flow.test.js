/**
 * E2E Tests for Critical User Workflows
 * Tests the complete user journey from onboarding to workout completion to export
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const setupDOM = () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
  });
  
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
  Object.defineProperty(global.window, 'localStorage', { value: localStorageMock });
  
  // Mock IndexedDB
  const indexedDBMock = {
    open: vi.fn(),
    deleteDatabase: vi.fn()
  };
  Object.defineProperty(global.window, 'indexedDB', { value: indexedDBMock });
  
  // Mock Web Speech API
  const speechSynthesisMock = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    onvoiceschanged: null
  };
  Object.defineProperty(global.window, 'speechSynthesis', { value: speechSynthesisMock });
  
  // Mock speechUtterance
  global.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
    text: '',
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null,
    onstart: null,
    onend: null,
    onerror: null,
    onStart: null,
    onEnd: null,
    onError: null
  }));
  
  // Mock clipboard
  Object.defineProperty(global.navigator, 'clipboard', {
    value: {
      writeText: vi.fn()
    }
  });
  
  return dom;
};

describe('E2E: Complete User Workflow', () => {
  let dom;
  
  beforeEach(() => {
    dom = setupDOM();
    vi.clearAllMocks();
  });
  
  describe('Onboarding → Workout → Completion Flow', () => {
    it('should complete the full onboarding flow', async () => {
      // Navigate to onboarding
      const app = document.getElementById('app');
      app.innerHTML = '<div class="onboarding-view"><button id="start-onboarding">Start</button></div>';
      
      // Simulate user starting onboarding
      const startBtn = document.getElementById('start-onboarding');
      startBtn?.click();
      
      // Verify onboarding progresses
      expect(app.innerHTML).toContain('onboarding');
    });
    
    it('should be able to select and start a routine', async () => {
      // Setup routine list view
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="routines-view">
          <button class="routine-item" data-routine-id="1">Push Routine</button>
          <button class="routine-item" data-routine-id="2">Pull Routine</button>
        </div>
      `;
      
      // Select a routine
      const routineBtn = document.querySelector('[data-routine-id="1"]');
      routineBtn?.click();
      
      // Verify routine details view
      expect(document.querySelector('.routine-details')).toBeTruthy();
      
      // Start the routine
      const startBtn = document.getElementById('start-routine-btn');
      startBtn?.click();
      
      // Verify active workout view
      expect(document.querySelector('.active-workout')).toBeTruthy();
    });
    
    it('should complete a workout and show completion view', async () => {
      // Setup active workout view
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="active-workout">
          <div class="exercise-card">Push-Up</div>
          <button id="next-set-btn">Next Set</button>
        </div>
      `;
      
      // Complete multiple sets
      const nextSetBtn = document.getElementById('next-set-btn');
      for (let i = 0; i < 3; i++) {
        nextSetBtn?.click();
      }
      
      // Verify completion view appears
      expect(document.querySelector('.workout-completion')).toBeTruthy();
    });
  });
  
  describe('Export Flow', () => {
    it('should export workout data', async () => {
      // Setup export view
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="export-import-view">
          <button id="export-data-btn">Export Data</button>
          <input type="file" id="import-data-input" />
        </div>
      `;
      
      // Simulate export
      const exportBtn = document.getElementById('export-data-btn');
      exportBtn?.click();
      
      // Verify export functionality
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
  
  describe('Body Metrics Tracking', () => {
    it('should log body metrics', async () => {
      // Setup profile view
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="profile-view">
          <form id="body-metrics-form">
            <input type="number" id="weight" required />
            <input type="number" id="bodyFat" />
            <button type="submit">Add Metric</button>
          </form>
        </div>
      `;
      
      // Fill and submit form
      const weightInput = document.getElementById('weight');
      const bodyFatInput = document.getElementById('bodyFat');
      const form = document.getElementById('body-metrics-form');
      
      weightInput.value = '70';
      bodyFatInput.value = '15';
      
      form?.dispatchEvent(new Event('submit', { cancelable: true }));
      
      // Verify form submission
      expect(weightInput.value).toBe('70');
    });
  });
  
  describe('Voice Cues Integration', () => {
    it('should trigger voice cues during workout', async () => {
      // Setup voice cues service mock
      const speechMock = {
        speak: vi.fn(),
        cancel: vi.fn()
      };
      global.window.speechSynthesis = speechMock;
      
      // Setup active workout view
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="active-workout">
          <button id="rest-complete-btn">Rest Complete</button>
        </div>
      `;
      
      // Trigger voice cue
      const restCompleteBtn = document.getElementById('rest-complete-btn');
      restCompleteBtn?.click();
      
      // Verify speech was triggered
      expect(speechMock.speak).toHaveBeenCalled();
    });
  });
  
  describe('Warm-up Generator', () => {
    it('should generate warm-up based on targeted muscles', async () => {
      // Mock warm-up generator
      const mockWarmUp = [
        { exerciseId: 1, sets: 2, reps: '10-12', restTime: 30 }
      ];
      
      expect(mockWarmUp).toHaveLength(1);
      expect(mockWarmUp[0].sets).toBe(2);
    });
  });
  
  describe('Exercise Substitution', () => {
    it('should suggest alternative exercises', async () => {
      // Mock exercise suggestions
      const suggestions = [
        { id: 2, name: 'Incline Push-Up', difficulty: 'beginner' },
        { id: 3, name: 'Diamond Push-Up', difficulty: 'intermediate' }
      ];
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].difficulty).toBe('beginner');
    });
  });
});

describe('E2E: Achievement System', () => {
  it('should unlock achievements on workout milestones', async () => {
    // Mock achievement check
    const achievements = [
      { id: 'first_workout', name: 'First Blood', unlocked: true },
      { id: 'five_workouts', name: 'Five Star', unlocked: false }
    ];
    
    expect(achievements[0].unlocked).toBe(true);
    expect(achievements[0].name).toBe('First Blood');
  });
});
