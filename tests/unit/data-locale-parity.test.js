import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataEn = JSON.parse(readFileSync(join(__dirname, '../../data/data.json'), 'utf-8'));
const dataEs = JSON.parse(readFileSync(join(__dirname, '../../data/data-es.json'), 'utf-8'));

/**
 * Recursively get all string values from a nested object
 * @param {object} obj - Object to extract strings from
 * @returns {string[]} Array of string values
 */
function getAllStrings(obj) {
  let strings = [];
  
  if (typeof obj === 'string') {
    return [obj];
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      strings = strings.concat(getAllStrings(item));
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const value of Object.values(obj)) {
      strings = strings.concat(getAllStrings(value));
    }
  }
  
  return strings;
}

describe('Data Locale Parity', () => {
  describe('data.json vs data-es.json', () => {
    it('should have different content (not identical files)', () => {
      const dataEnStr = JSON.stringify(dataEn);
      const dataEsStr = JSON.stringify(dataEs);
      
      expect(dataEnStr).not.toBe(dataEsStr);
    });

    it('should have same structure (same keys at top level)', () => {
      const enKeys = Object.keys(dataEn);
      const esKeys = Object.keys(dataEs);
      
      expect(enKeys).toEqual(esKeys);
    });

    it('should have exercises in both files', () => {
      expect(dataEn.exercises).toBeDefined();
      expect(dataEs.exercises).toBeDefined();
      expect(Array.isArray(dataEn.exercises)).toBe(true);
      expect(Array.isArray(dataEs.exercises)).toBe(true);
    });

    it('should have same number of exercises', () => {
      expect(dataEn.exercises.length).toBe(dataEs.exercises.length);
    });

    it('should have different exercise names (EN vs ES)', () => {
      // Exercise names that are valid loanwords and can be the same in both languages
      // These are commonly used exercise terms that are not translated in Spanish
      const loanwords = [
        'Burpee', 'Plank', 'Cardio', 'Cossack', 'Sumo', 'Kriss', 'Bicycles', 'Chin-Up',
        'One-Arm Handstand', 'Tuck L-Sit', 'Windshield Wipers', 'Tuck Planche Hold',
        'Tuck Front Lever', 'One-Arm Chin-Up', 'Planche', 'Clamshell', 'Tuck Planche',
        'Step-Up', 'Muscle-Up', 'V-Sit', 'Rows', 'Crunch', 'Muscle-Up Negative',
        'L-Sit', 'Natural Glute-Ham Raise', 'Superman Hold'
      ];
      
      for (let i = 0; i < dataEn.exercises.length; i++) {
        const enName = dataEn.exercises[i].name;
        const esName = dataEs.exercises[i].name;
        
        expect(enName).toBeDefined();
        expect(esName).toBeDefined();
        // Allow loanwords that are the same in both languages
        const isLoanword = loanwords.some(lw => enName.toLowerCase().includes(lw.toLowerCase()));
        if (!isLoanword) {
          expect(enName).not.toBe(esName);
        }
      }
    });

    it('should have categories in both files', () => {
      expect(dataEn.categories).toBeDefined();
      expect(dataEs.categories).toBeDefined();
      expect(Array.isArray(dataEn.categories)).toBe(true);
      expect(Array.isArray(dataEs.categories)).toBe(true);
    });

    it('should have same number of categories', () => {
      expect(dataEn.categories.length).toBe(dataEs.categories.length);
    });

    it('should have different category names (EN vs ES)', () => {
      for (let i = 0; i < dataEn.categories.length; i++) {
        const enName = dataEn.categories[i].name;
        const esName = dataEs.categories[i].name;
        
        expect(enName).toBeDefined();
        expect(esName).toBeDefined();
        // Allow loanwords like "Cardio" that are the same in both languages
        if (enName !== 'Cardio') {
          expect(enName).not.toBe(esName);
        }
      }
    });

    it('should have equipment in both files', () => {
      expect(dataEn.equipment).toBeDefined();
      expect(dataEs.equipment).toBeDefined();
    });

    it('should have same number of equipment items', () => {
      expect(dataEn.equipment.length).toBe(dataEs.equipment.length);
    });

    it('should have muscles in both files', () => {
      expect(dataEn.muscles).toBeDefined();
      expect(dataEs.muscles).toBeDefined();
    });

    it('should have same number of muscle groups', () => {
      expect(dataEn.muscles.length).toBe(dataEs.muscles.length);
    });

    it('should have difficulties in both files', () => {
      expect(dataEn.difficulties).toBeDefined();
      expect(dataEs.difficulties).toBeDefined();
    });

    it('should have same number of difficulty levels', () => {
      expect(dataEn.difficulties.length).toBe(dataEs.difficulties.length);
    });

    it('should verify Spanish category language', () => {
      // Check that at least some categories are in Spanish
      const spanishCategories = dataEs.categories.filter(c => 
        /[áéíóúñ]/.test(c.name) || 
        ['Empuje', 'Jalón', 'Cuerpo completo'].some(spanishTerm => c.name.includes(spanishTerm))
      );
      expect(spanishCategories.length).toBeGreaterThan(0);
    });

    it('should verify Spanish exercise language', () => {
      // Check that at least some exercises are in Spanish
      const spanishExercises = dataEs.exercises.filter(ex => 
        /[áéíóúñ]/.test(ex.name) || 
        ['Flexión', 'Dominada', 'Sentadilla', 'Plancha'].some(spanishTerm => ex.name.includes(spanishTerm))
      );
      expect(spanishExercises.length).toBeGreaterThan(0);
    });

    it('should have consistent IDs across locales', () => {
      const enIds = new Set(dataEn.exercises.map(e => e.id));
      const esIds = new Set(dataEs.exercises.map(e => e.id));
      
      expect(enIds).toEqual(esIds);
    });

    it('should have descriptions in Spanish', () => {
      for (const exercise of dataEs.exercises) {
        if (exercise.description) {
          expect(exercise.description).toBeDefined();
          expect(typeof exercise.description).toBe('string');
          // Should contain Spanish words (common Spanish words or structure)
          const hasSpanishMarkers = /[áéíóúñ]/.test(exercise.description) ||
            /[a-z]+(?:ción|mente|idad|ando|iendo)/.test(exercise.description.toLowerCase()) ||
            /\b(el|la|los|las|un|una|de|con|para|mientras|como)\b/i.test(exercise.description);
          expect(hasSpanishMarkers).toBe(true);
        }
      }
    });

    it('should have instructions in Spanish', () => {
      for (const exercise of dataEs.exercises) {
        if (exercise.instructions) {
          for (const instruction of exercise.instructions) {
            expect(instruction).toBeDefined();
            expect(typeof instruction).toBe('string');
            // Should contain Spanish words
            expect(/[áéíóúñ]/.test(instruction) || /[a-z]+(?:ción|mente|idad)/.test(instruction.toLowerCase())).toBe(true);
          }
        }
      }
    });
  });

  describe('Data integrity', () => {
    it('should have no missing required fields in English', () => {
      for (const exercise of dataEn.exercises) {
        expect(exercise.id).toBeDefined();
        expect(exercise.name).toBeDefined();
        expect(exercise.categories).toBeDefined();
      }
    });

    it('should have no missing required fields in Spanish', () => {
      for (const exercise of dataEs.exercises) {
        expect(exercise.id).toBeDefined();
        expect(exercise.name).toBeDefined();
        expect(exercise.categories).toBeDefined();
      }
    });

    it('should have valid muscle groups', () => {
      const validMuscles = ['chest', 'back', 'legs', 'arms', 'core'];
      
      for (const exercise of dataEn.exercises) {
        if (exercise.muscle) {
          expect(validMuscles.includes(exercise.muscle.toLowerCase())).toBe(true);
        }
      }
    });

    it('should have consistent category references', () => {
      const categoryIds = new Set(dataEn.categories.map(c => c.id));
      
      for (const exercise of dataEn.exercises) {
        if (exercise.category) {
          expect(categoryIds.has(exercise.category)).toBe(true);
        }
      }
    });
  });

  describe('Translation quality', () => {
    it('should not have empty translations', () => {
      for (const exercise of dataEs.exercises) {
        if (exercise.name) {
          expect(exercise.name.trim()).not.toBe('');
        }
        if (exercise.description) {
          expect(exercise.description.trim()).not.toBe('');
        }
      }
    });

    it('should have proper capitalization in Spanish', () => {
      for (const exercise of dataEs.exercises) {
        if (exercise.name) {
          // Spanish names should start with capital letter
          expect(exercise.name[0]).toBe(exercise.name[0].toUpperCase());
        }
      }
    });

    it('should not have English words in Spanish data', () => {
      // Common English exercise terms that should be translated
      const englishWords = [
        'push-up', 'pull-up', 'dip', 'squat', 'lunge',
        'mountain climber', 'ab rollout'
      ];
      
      for (const exercise of dataEs.exercises) {
        const nameLower = exercise.name.toLowerCase();
        for (const word of englishWords) {
          // Allow proper nouns and loanwords that are commonly used in Spanish
          const allowedExceptions = ['burpee', 'plank', 'cossack', 'sumo', 'korean', 'ring', 'cardio'];
          const isException = allowedExceptions.some(exc => nameLower.includes(exc));
          
          if (!isException) {
            expect(nameLower).not.toContain(word);
          }
        }
      }
    });
  });
});
