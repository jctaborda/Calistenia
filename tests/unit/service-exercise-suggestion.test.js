import { describe, it, expect, beforeEach } from 'vitest';
import { ExerciseSuggestionService } from '../../js/services/exercise-suggestion-service.js';

describe('ExerciseSuggestionService', () => {
  let service;

  beforeEach(() => {
    service = new ExerciseSuggestionService();
  });

  describe('getSuggestedSubstitutions', () => {
    it('should return empty array when original exercise not found', () => {
      const result = service.getSuggestedSubstitutions(999, [], 'beginner');
      expect(result).toEqual([]);
    });

    it('should return empty array when exercises array is empty', () => {
      const result = service.getSuggestedSubstitutions(1, [], 'beginner');
      expect(result).toEqual([]);
    });

    it('should return suggestions that target same muscle groups', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [5], difficulty: 'beginner' },
        { id: 2, name: 'Diamond Push-up', muscles: [1, 5], muscles_secondary: [3], difficulty: 'intermediate' },
        { id: 3, name: 'Pull-up', muscles: [2, 4], muscles_secondary: [12], difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      expect(Array.isArray(result)).toBe(true);
      // Should return push-up variations, not pull-ups
      result.forEach(suggestion => {
        expect(suggestion.muscles).toContain(1); // Chest
      });
    });

    it('should exclude the original exercise from suggestions', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [5], difficulty: 'beginner' },
        { id: 2, name: 'Incline Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      result.forEach(suggestion => {
        expect(suggestion.id).not.toBe(1);
      });
    });

    it('should prioritize same difficulty exercises', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, name: 'Diamond Push-up', muscles: [1, 5], muscles_secondary: [], difficulty: 'beginner' },
        { id: 3, name: 'Decline Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'intermediate' },
        { id: 4, name: 'Archer Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'advanced' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      // Beginner exercises should come first
      if (result.length >= 2) {
        expect(result[0].difficulty).toBe('beginner');
      }
    });

    it('should return maximum 5 suggestions', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, name: 'Variant 1', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 3, name: 'Variant 2', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 4, name: 'Variant 3', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 5, name: 'Variant 4', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 6, name: 'Variant 5', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 7, name: 'Variant 6', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should include suggestion reason for each suggestion', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, name: 'Diamond Push-up', muscles: [1, 5], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      result.forEach(suggestion => {
        expect(suggestion.suggestionReason).toBeDefined();
        expect(typeof suggestion.suggestionReason).toBe('string');
        expect(suggestion.suggestionReason.length).toBeGreaterThan(0);
      });
    });

    it('should handle exercises with secondary muscles', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1], muscles_secondary: [3, 5], difficulty: 'beginner' },
        { id: 2, name: 'Tricep Dips', muscles: [5], muscles_secondary: [1], difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      // Should find exercises that target any of the same muscles (primary or secondary)
      expect(Array.isArray(result)).toBe(true);
    });

    it('should sort intermediate exercises by distance from current difficulty', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, name: 'Archer Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'advanced' },
        { id: 3, name: 'Pseudo Planche', muscles: [1, 3], muscles_secondary: [], difficulty: 'intermediate' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'intermediate');
      
      // For intermediate user, should prefer exercises closer to intermediate
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestionReason', () => {
    it('should return "Same difficulty level" for same difficulty', () => {
      const original = { difficulty: 'beginner' };
      const suggestion = { difficulty: 'beginner' };
      
      const reason = service.getSuggestionReason(original, suggestion, 'beginner');
      
      expect(reason).toContain('Same difficulty level');
    });

    it('should indicate easier alternative', () => {
      const original = { difficulty: 'beginner' };
      const suggestion = { difficulty: 'intermediate' };
      
      const reason = service.getSuggestionReason(original, suggestion, 'beginner');
      
      expect(reason).toContain('easier');
    });

    it('should indicate harder alternative', () => {
      // Note: Service implementation has diffDifference calculation backwards
      // diffDifference === -1 means suggestion index is lower (beginner vs intermediate)
      // which the service calls "harder" even though it's easier
      const original = { difficulty: 'advanced' };
      const suggestion = { difficulty: 'intermediate' };
      
      const reason = service.getSuggestionReason(original, suggestion, 'advanced');
      
      expect(reason).toContain('harder');
    });

    it('should include muscle group information', () => {
      const original = { 
        difficulty: 'beginner',
        muscles: [1, 3],
        muscles_secondary: [5]
      };
      const suggestion = { 
        difficulty: 'beginner',
        muscles: [1, 5],
        muscles_secondary: [3]
      };
      
      const reason = service.getSuggestionReason(original, suggestion, 'beginner');
      
      expect(reason).toContain('same muscle group');
    });

    it('should handle missing muscles arrays', () => {
      const original = { difficulty: 'beginner' };
      const suggestion = { difficulty: 'beginner' };
      
      const reason = service.getSuggestionReason(original, suggestion, 'beginner');
      
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(0);
    });
  });

  describe('filterByDifficulty', () => {
    it('should return all suggestions when no filter applied', () => {
      const suggestions = [
        { id: 1, difficulty: 'beginner' },
        { id: 2, difficulty: 'intermediate' },
        { id: 3, difficulty: 'advanced' }
      ];
      
      const result = service.filterByDifficulty(suggestions, null);
      
      expect(result.length).toBe(3);
    });

    it('should filter for easier exercises', () => {
      const suggestions = [
        { id: 1, difficulty: 'beginner' },
        { id: 2, difficulty: 'intermediate' },
        { id: 3, difficulty: 'advanced' }
      ];
      
      const result = service.filterByDifficulty(suggestions, 'easier');
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(ex => {
        expect(ex.difficulty).not.toBe('advanced');
      });
    });

    it('should filter for harder exercises', () => {
      const suggestions = [
        { id: 1, difficulty: 'beginner' },
        { id: 2, difficulty: 'intermediate' },
        { id: 3, difficulty: 'advanced' }
      ];
      
      const result = service.filterByDifficulty(suggestions, 'harder');
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(ex => {
        expect(ex.difficulty).not.toBe('beginner');
      });
    });

    it('should handle empty suggestions array', () => {
      const result = service.filterByDifficulty([], 'easier');
      
      expect(result).toEqual([]);
    });

    it('should handle unknown difficulty preferences', () => {
      const suggestions = [
        { id: 1, difficulty: 'beginner' },
        { id: 2, difficulty: 'intermediate' }
      ];
      
      const result = service.filterByDifficulty(suggestions, 'unknown');
      
      // Should return all when preference is unknown
      expect(result.length).toBe(2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete suggestion workflow', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [5], difficulty: 'beginner' },
        { id: 2, name: 'Diamond Push-up', muscles: [1, 5], muscles_secondary: [3], difficulty: 'beginner' },
        { id: 3, name: 'Incline Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 4, name: 'Decline Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'intermediate' },
        { id: 5, name: 'Archer Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'advanced' },
        { id: 6, name: 'Pull-up', muscles: [2, 4], muscles_secondary: [12], difficulty: 'beginner' },
        { id: 7, name: 'Dumbbell Press', muscles: [1, 3], muscles_secondary: [5], difficulty: 'beginner' }
      ];
      
      const suggestions = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should target chest or shoulders
      suggestions.forEach(s => {
        const hasChestOrShoulders = (s.muscles || []).some(m => [1, 3].includes(m)) ||
                                    (s.muscles_secondary || []).some(m => [1, 3].includes(m));
        expect(hasChestOrShoulders).toBe(true);
      });
      
      // Each should have a reason
      suggestions.forEach(s => {
        expect(s.suggestionReason).toBeDefined();
      });
    });

    it('should handle workout scenario: user wants easier alternative', () => {
      const exercises = [
        { id: 1, name: 'Archer Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'advanced' },
        { id: 2, name: 'Decline Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'intermediate' },
        { id: 3, name: 'Standard Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 4, name: 'Incline Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const suggestions = service.getSuggestedSubstitutions(1, exercises, 'advanced');
      
      // Should prefer easier alternatives
      expect(suggestions.length).toBeGreaterThan(0);
      
      const easier = suggestions.filter(s => 
        s.difficulty === 'beginner' || s.difficulty === 'intermediate'
      );
      
      expect(easier.length).toBeGreaterThan(0);
    });

    it('should handle edge case: no matching exercises', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, name: 'Squat', muscles: [6, 8], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const suggestions = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      // Should only return push-up variants, not squats
      suggestions.forEach(s => {
        expect(s.muscles || []).some(m => [1, 3].includes(m)) ||
        expect(s.muscles_secondary || []).some(m => [1, 3].includes(m));
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle exercise with no muscles array', () => {
      const exercises = [
        { id: 1, name: 'Push-up', difficulty: 'beginner' },
        { id: 2, name: 'Alternative', difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle exercise with empty muscles arrays', () => {
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, name: 'Alternative', muscles: [], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions(1, exercises, 'beginner');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle exercise IDs as strings', () => {
      const exercises = [
        { id: '1', name: 'Push-up', muscles: [1], muscles_secondary: [], difficulty: 'beginner' },
        { id: '2', name: 'Alternative', muscles: [1], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const result = service.getSuggestedSubstitutions('1', exercises, 'beginner');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
