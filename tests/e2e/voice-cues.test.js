/**
 * E2E Tests for Voice Cues Service
 * Tests the Web Speech API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Voice Cues Service E2E', () => {
  let dom;
  
  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
      pretendToBeVisual: true
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    
    // Mock Web Speech API
    const speechSynthesisMock = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [
        { name: 'Google US English', lang: 'en-US' }
      ]),
      onvoiceschanged: null
    };
    Object.defineProperty(global.window, 'speechSynthesis', { value: speechSynthesisMock });
    
    global.SpeechSynthesisUtterance = vi.fn().mockImplementation(function() {
      this.text = '';
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    });
  });
  
  describe('Voice Cues Initialization', () => {
    it('should initialize successfully when Web Speech API is available', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      
      const initialized = voiceCuesService.initialize();
      
      expect(initialized).toBe(true);
      expect(voiceCuesService.isInitialized).toBe(true);
    });
    
    it('should return false when Web Speech API is not available', async () => {
      // Remove speech synthesis
      delete global.window.speechSynthesis;
      
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      
      const initialized = voiceCuesService.initialize();
      
      expect(initialized).toBe(false);
      expect(voiceCuesService.isInitialized).toBe(false);
    });
  });
  
  describe('Voice Cue Announcements', () => {
    it('should announce rest complete', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      
      voiceCuesService.announceRestComplete();
      
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });
    
    it('should announce next exercise', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      
      voiceCuesService.announceNextExercise('Push-Up');
      
      expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Push-Up') })
      );
    });
    
    it('should announce workout start', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      
      voiceCuesService.announceWorkoutStart('Push Routine');
      
      expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Push Routine') })
      );
    });
    
    it('should announce workout complete', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      
      voiceCuesService.announceWorkoutComplete('Pull Routine');
      
      expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Pull Routine') })
      );
    });
    
    it('should announce HIIT work phase', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      
      voiceCuesService.announceHIITWork(30);
      
      expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('30') })
      );
    });
    
    it('should announce HIIT rest phase', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      
      voiceCuesService.announceHIITRest(10);
      
      expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('10') })
      );
    });
  });
  
  describe('Voice Cue Control', () => {
    it('should disable voice cues', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      voiceCuesService.disable();
      
      expect(voiceCuesService.isEnabled()).toBe(false);
    });
    
    it('should stop speaking', async () => {
      const { voiceCuesService } = await import('../../js/services/voice-cues-service.js');
      voiceCuesService.enable();
      
      voiceCuesService.stop();
      
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });
  });
});
