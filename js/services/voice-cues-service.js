/**
 * VoiceCuesService - Provides voice announcements during workouts using Web Speech API
 */

export class VoiceCuesService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isInitialized = false;
    this.isSpeaking = false;
    this.voiceEnabled = false;
    this.voiceRate = 1;
    this.voicePitch = 1;
    this.voiceVolume = 1;
  }

  /**
   * Initialize voice cues service
   * @returns {boolean} Whether voice synthesis is supported
   */
  initialize() {
    if (!this.synth) {
      console.warn('Web Speech API not supported in this browser');
      return false;
    }

    this.isInitialized = true;
    
    // Load available voices
    this.loadVoices();
    
    return true;
  }

  /**
   * Load available voices (may be async in some browsers)
   */
  loadVoices() {
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }
    this.voices = this.synth.getVoices();
  }

  /**
   * Enable voice cues
   */
  enable() {
    this.voiceEnabled = true;
  }

  /**
   * Disable voice cues
   */
  disable() {
    this.voiceEnabled = false;
    this.stop();
  }

  /**
   * Check if voice cues are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.voiceEnabled && this.isInitialized;
  }

  /**
   * Speak text using Web Speech API
   * @param {string} text - Text to speak
   * @param {object} options - Speech options
   * @param {Function} options.onStart - Callback when speech starts
   * @param {Function} options.onEnd - Callback when speech ends
   * @param {Function} options.onError - Callback on error
   */
  speak(text, options = {}) {
    if (!this.voiceEnabled) {
      return;
    }

    if (!this.isInitialized) {
      this.initialize();
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice properties
    utterance.rate = this.voiceRate;
    utterance.pitch = this.voicePitch;
    utterance.volume = this.voiceVolume;

    // Try to select an English voice
    const englishVoice = this.voices.find(v => v.lang.includes('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      console.error('Speech synthesis error:', event);
      if (options.onError) options.onError(event);
    };

    this.synth.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Get current speaking state
   * @returns {boolean}
   */
  isCurrentlySpeaking() {
    return this.isSpeaking && this.synth.speaking;
  }

  /**
   * Announce rest complete
   */
  announceRestComplete() {
    if (this.isEnabled()) {
      this.speak('Rest complete. Ready for next set?');
    }
  }

  /**
   * Announce next exercise
   * @param {string} exerciseName - Name of the next exercise
   */
  announceNextExercise(exerciseName) {
    if (this.isEnabled()) {
      this.speak(`Next exercise: ${exerciseName}`);
    }
  }

  /**
   * Announce workout start
   * @param {string} routineName - Name of the routine
   */
  announceWorkoutStart(routineName) {
    if (this.isEnabled()) {
      this.speak(`Starting workout: ${routineName}. Good luck!`);
    }
  }

  /**
   * Announce workout complete
   * @param {string} routineName - Name of the routine
   */
  announceWorkoutComplete(routineName) {
    if (this.isEnabled()) {
      this.speak(`Workout complete: ${routineName}. Great job!`);
    }
  }

  /**
   * Announce set reminder
   * @param {number} setNumber - Current set number
   * @param {number} totalSets - Total sets for exercise
   */
  announceSetReminder(setNumber, totalSets) {
    if (this.isEnabled()) {
      this.speak(`Set ${setNumber} of ${totalSets}`);
    }
  }

  /**
   * Announce HIIT work phase
   * @param {number} seconds - Duration of work phase
   */
  announceHIITWork(seconds) {
    if (this.isEnabled()) {
      this.speak(`Work phase: ${seconds} seconds`);
    }
  }

  /**
   * Announce HIIT rest phase
   * @param {number} seconds - Duration of rest phase
   */
  announceHIITRest(seconds) {
    if (this.isEnabled()) {
      this.speak(`Rest phase: ${seconds} seconds`);
    }
  }

  /**
   * Announce rest timer start
   * @param {number} seconds - Rest duration
   */
  announceRestStart(seconds) {
    if (this.isEnabled()) {
      this.speak(`Rest timer started: ${seconds} seconds`);
    }
  }

  /**
   * Announce cooldown start
   */
  announceCooldownStart() {
    if (this.isEnabled()) {
      this.speak('Starting cooldown. Keep moving!');
    }
  }
}

// Export singleton instance
export const voiceCuesService = new VoiceCuesService();
