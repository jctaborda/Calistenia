/**
 * SoundService - Beep and vibration feedback for timers
 * Uses Web Audio API for beeps and navigator.vibrate() for haptic feedback.
 */

class SoundService {
  constructor() {
    this._audioCtx = null;
  }

  /**
   * Get or create AudioContext (lazy, requires user gesture on first call)
   */
  _getContext() {
    if (!this._audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) this._audioCtx = new Ctx();
    }
    return this._audioCtx;
  }

  /**
   * Play a short beep tone
   * @param {number} frequency - Hz (default 880)
   * @param {number} duration - seconds (default 0.15)
   * @param {number} volume - 0-1 (default 0.3)
   */
  playBeep(frequency = 880, duration = 0.15, volume = 0.3) {
    const ctx = this._getContext();
    if (!ctx) return;

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  /**
   * Play a triple-beep pattern (rising tones) for rest complete
   */
  playRestComplete() {
    this.playBeep(660, 0.1, 0.3);
    setTimeout(() => this.playBeep(880, 0.1, 0.3), 120);
    setTimeout(() => this.playBeep(1100, 0.2, 0.3), 240);
  }

  /**
   * Trigger device vibration
   * @param {number|number[]} pattern - Vibration duration in ms or pattern array
   */
  vibrate(pattern = 200) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
}

export const soundService = new SoundService();
