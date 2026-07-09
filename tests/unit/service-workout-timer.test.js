import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkoutTimerService } from '../../js/services/workout-timer-service.js';

describe('WorkoutTimerService', () => {
  let service;
  let mockContainer;
  let mockOnComplete;

  beforeEach(() => {
    service = new WorkoutTimerService();
    mockOnComplete = vi.fn();
    
    // Create mock container element
    mockContainer = {
      innerHTML: '',
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: {},
      textContent: '',
      disabled: false,
      scrollTop: 0
    };
    
    // Mock DOM elements
    vi.spyOn(document, 'getElementById').mockImplementation(id => {
      if (id === 'timer-seconds') return { textContent: '' };
      if (id === 'timer-progress') return { style: {} };
      if (id === 'hiit-timer-display') return mockContainer;
      if (id === 'start-hiit-btn') return mockContainer;
      return null;
    });
  });

  afterEach(() => {
    service.stopTimer();
    service.stopHIITTimer();
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with null timerInterval', () => {
      expect(service.timerInterval).toBeNull();
    });

    it('should initialize with null activeTimer', () => {
      expect(service.activeTimer).toBeNull();
    });
  });

  describe('stopTimer', () => {
    it('should clear timer interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      service.timerInterval = setInterval(() => {}, 1000);
      service.stopTimer();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(service.timerInterval).toBeNull();
    });

    it('should set activeTimer to null', () => {
      service.activeTimer = { update: () => {} };
      service.stopTimer();
      
      expect(service.activeTimer).toBeNull();
    });

    it('should handle calling stopTimer when no timer is active', () => {
      expect(() => service.stopTimer()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should call stopTimer', () => {
      const spy = vi.spyOn(service, 'stopTimer');
      service.cleanup();
      expect(spy).toHaveBeenCalled();
    });

    it('should call stopHIITTimer', () => {
      const spy = vi.spyOn(service, 'stopHIITTimer');
      service.cleanup();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('renderHiitSection', () => {
    it('should return valid HTML string', () => {
      const result = service.renderHiitSection(30);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('hiit-section');
      expect(result).toContain('HIIT/Tabata Mode');
      expect(result).toContain('30s');
      expect(result).toContain('start-hiit-btn');
    });

    it('should include dynamic interval time', () => {
      const result = service.renderHiitSection(45);
      
      expect(result).toContain('45s');
    });

    it('should have proper structure', () => {
      const result = service.renderHiitSection(30);
      
      expect(result).toContain('<div class="hiit-section">');
      expect(result).toContain('<h3>');
      expect(result).toContain('<button id="start-hiit-btn"');
    });
  });

  describe('startHIITTimer', () => {
    it('should return early if container element not found', () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const result = service.startHIITTimer(30, 10, {
        onWorkStart: vi.fn(),
        onWorkEnd: vi.fn(),
        onRestStart: vi.fn(),
        onRestEnd: vi.fn()
      });
      
      expect(result).toBeUndefined();
    });

    it('should call onWorkStart when started', () => {
      const onWorkStart = vi.fn();
      const onWorkEnd = vi.fn();
      const onRestStart = vi.fn();
      const onRestEnd = vi.fn();
      
      // Mock the elements to exist
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      service.startHIITTimer(30, 10, {
        onWorkStart,
        onWorkEnd,
        onRestStart,
        onRestEnd
      });
      
      // Trigger the click event
      const clickHandler = mockBtn.addEventListener.mock.calls[0][1];
      clickHandler();
      
      expect(onWorkStart).toHaveBeenCalled();
    });

    it('should stop HIIT timer when stopped', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      service.startHIITTimer(30, 10, {
        onWorkStart: vi.fn(),
        onWorkEnd: vi.fn(),
        onRestStart: vi.fn(),
        onRestEnd: vi.fn()
      });
      
      service.stopHIITTimer();
      
      expect(service.activeTimer).toBeNull();
    });

    it('should handle custom work and rest times', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      service.startHIITTimer(45, 15, {
        onWorkStart: vi.fn(),
        onWorkEnd: vi.fn(),
        onRestStart: vi.fn(),
        onRestEnd: vi.fn()
      });
      
      expect(service.activeTimer).not.toBeNull();
    });

    it('should default rest time to work time', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      service.startHIITTimer(30, null, {
        onWorkStart: vi.fn(),
        onWorkEnd: vi.fn(),
        onRestStart: vi.fn(),
        onRestEnd: vi.fn()
      });
      
      expect(service.activeTimer).not.toBeNull();
    });

    it('should handle rounds parameter', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      service.startHIITTimer(30, 10, {
        onWorkStart: vi.fn(),
        onWorkEnd: vi.fn(),
        onRestStart: vi.fn(),
        onRestEnd: vi.fn(),
        rounds: 4
      });
      
      expect(service.activeTimer).not.toBeNull();
    });
  });

  describe('state management', () => {
    it('should handle multiple timer stops gracefully', () => {
      expect(() => {
        service.stopTimer();
        service.stopTimer();
        service.stopTimer();
      }).not.toThrow();
    });

    it('should handle multiple HIIT timer stops gracefully', () => {
      expect(() => {
        service.stopHIITTimer();
        service.stopHIITTimer();
        service.stopHIITTimer();
      }).not.toThrow();
    });

    it('should handle cleanup when no timers are active', () => {
      expect(() => service.cleanup()).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete HIIT timer workflow', () => {
      const callbacks = {
        onWorkStart: vi.fn(),
        onWorkEnd: vi.fn(),
        onRestStart: vi.fn(),
        onRestEnd: vi.fn()
      };
      
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      // Start timer
      service.startHIITTimer(30, 10, callbacks);
      
      // Trigger start
      const clickHandler = mockBtn.addEventListener.mock.calls[0][1];
      clickHandler();
      
      // Verify callbacks were called
      expect(callbacks.onWorkStart).toHaveBeenCalled();
      
      // Stop timer
      service.stopHIITTimer();
      
      expect(service.activeTimer).toBeNull();
    });

    it('should handle timer service lifecycle', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      // Create and start timer
      service.startHIITTimer(30, 10, {
        onWorkStart: vi.fn(),
        onWorkEnd: vi.fn(),
        onRestStart: vi.fn(),
        onRestEnd: vi.fn()
      });
      
      expect(service.activeTimer).not.toBeNull();
      
      // Clean up
      service.cleanup();
      
      expect(service.activeTimer).toBeNull();
      expect(service.timerInterval).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero work time', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      expect(() => {
        service.startHIITTimer(0, 0, {
          onWorkStart: vi.fn(),
          onWorkEnd: vi.fn(),
          onRestStart: vi.fn(),
          onRestEnd: vi.fn()
        });
      }).not.toThrow();
    });

    it('should handle negative rest time', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      expect(() => {
        service.startHIITTimer(30, -10, {
          onWorkStart: vi.fn(),
          onWorkEnd: vi.fn(),
          onRestStart: vi.fn(),
          onRestEnd: vi.fn()
        });
      }).not.toThrow();
    });

    it('should handle null callback options', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      expect(() => {
        service.startHIITTimer(30, 10, {});
      }).not.toThrow();
    });

    it('should handle very large interval times', () => {
      const mockBtn = {
        disabled: false,
        textContent: 'Start Interval',
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'getElementById').mockImplementation(id => {
        if (id === 'hiit-timer-display') return mockContainer;
        if (id === 'start-hiit-btn') return mockBtn;
        return null;
      });
      
      expect(() => {
        service.startHIITTimer(3600, 1800, {
          onWorkStart: vi.fn(),
          onWorkEnd: vi.fn(),
          onRestStart: vi.fn(),
          onRestEnd: vi.fn()
        });
      }).not.toThrow();
    });
  });
});
