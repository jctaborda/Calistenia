import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read i18n.js and extract translations using a simpler approach
const i18nContent = readFileSync(__dirname + '/../../js/i18n.js', 'utf-8');

// Extract keys from the file (format: 'key': 'value' or 'key': "value")
// Handles escaped quotes within values
function extractTranslations(content) {
  const translations = {};
  
  // Split by newlines and process each line
  const lines = content.split('\n');
  for (const line of lines) {
    // Match lines with translation keys
    const match = line.match(/^[\s]*'([^']+)':\s*["'](.*)["'],\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      // Unescape common escape sequences
      value = value
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      translations[key] = value;
    }
  }
  
  return translations;
}

// Find the en and es sections
const enSectionStart = i18nContent.indexOf('en: {');
const esSectionStart = i18nContent.indexOf('es: {');
const sectionEnd = i18nContent.indexOf('};', esSectionStart);

const enContent = i18nContent.substring(enSectionStart, esSectionStart);
const esContent = i18nContent.substring(esSectionStart, sectionEnd);

const enTranslations = extractTranslations(enContent);
const esTranslations = extractTranslations(esContent);

/**
 * Recursively get all keys from a nested object
 * @param {object} obj - Object to extract keys from
 * @param {string} prefix - Current key prefix (for recursion)
 * @returns {string[]} Array of dot-notation keys
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

describe('i18n Key Parity', () => {
  describe('English vs Spanish translations', () => {
    let enKeys, esKeys;
    
    beforeEach(() => {
      enKeys = new Set(getAllKeys(enTranslations));
      esKeys = new Set(getAllKeys(esTranslations));
    });

    it('should have same number of keys in both languages', () => {
      expect(enKeys.size).toBe(esKeys.size);
    });

    it('should have all English keys present in Spanish', () => {
      const missingFromEs = [...enKeys].filter(key => !esKeys.has(key));
      
      if (missingFromEs.length > 0) {
        console.warn('⚠️ Missing Spanish keys:', missingFromEs);
      }
      
      // Note: This is a warning, not a failure, as adding translations is a separate task
      expect(missingFromEs).toHaveLength(0);
    });

    it('should have all Spanish keys present in English', () => {
      const missingFromEn = [...esKeys].filter(key => !enKeys.has(key));
      
      if (missingFromEn.length > 0) {
        console.warn('⚠️ Missing English keys:', missingFromEn);
      }
      
      // Note: This is a warning, not a failure, as adding translations is a separate task
      expect(missingFromEn).toHaveLength(0);
    });

    it('should have non-empty translations for all keys', () => {
      for (const key of enKeys) {
        expect(enTranslations[key]).toBeDefined();
        expect(enTranslations[key]).not.toBe('');
        expect(typeof enTranslations[key]).toBe('string');
      }
      
      for (const key of esKeys) {
        expect(esTranslations[key]).toBeDefined();
        expect(esTranslations[key]).not.toBe('');
        expect(typeof esTranslations[key]).toBe('string');
      }
    });
  });

  describe('Translation completeness', () => {
    it('should have translations for common keys', () => {
      const commonKeys = [
        'app.title',
        'nav.home',
        'home.welcome',
        'routines.title',
        'exercises.title',
        'profile.title'
      ];
      
      for (const key of commonKeys) {
        expect(enTranslations[key]).toBeDefined();
        expect(esTranslations[key]).toBeDefined();
      }
    });
  });
});
