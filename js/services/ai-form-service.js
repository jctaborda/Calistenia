// AI Form Service - Real-time pose detection and form analysis using MediaPipe
// All processing happens in-browser - no video uploads
// Uses local @mediapipe/pose package (v0.5) with .tflite models

let Pose = null;

// MediaPipe Pose Landmark IDs (from @mediapipe/pose package)
const LANDMARKS = {
  NOSE: 0,
  NECK: 1,
  LEFT_EYE: 2,
  RIGHT_EYE: 3,
  LEFT_EAR: 4,
  RIGHT_EAR: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28
};

export class AIFormService {
  constructor() {
    this.pose = null;
    this.video = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.isRunning = false;
    this.lastVideoTime = 0;
    this.processingInterval = 100; // Process every 100ms (10fps)
    this.poseCallback = null;
    this.formCallback = null;
    this.repCallback = null;
    
    // Rep counting state
    this.repState = 'up'; // 'up' or 'down'
    this.repCount = 0;
    this.lastRepTime = 0;
    this.repCooldown = 500; // ms between reps
    
    // Form tracking
    this.formViolations = [];
    this.formScores = [];
    this.maxFormScores = 50; // Keep last 50 scores
  }

  /**
   * Initialize the MediaPipe Pose
   */
  async initialize() {
    if (this.pose) return;
    
    try {
      // Load from local @mediapipe/pose package
      // The pose.js file attaches Pose to window, not as ES module export
      await import('/assets/mediapipe/pose.js');
      
      // Get Pose from window object
      Pose = window.Pose;
      
      if (!Pose) {
        throw new Error('MediaPipe Pose not found on window object');
      }
      
      // Create Pose instance with local assets
      // @mediapipe/pose expects locateFile to return paths in the same directory
      this.pose = new Pose({
        locateFile: (file) => {
          // All MediaPipe files are in the same directory (/assets/mediapipe/)
          return `/assets/mediapipe/${file}`;
        }
      });
      
      // Set options with local model
      await this.pose.setOptions({
        modelComplexity: 1, // 0=lite, 1=full, 2=heavy
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      // Initialize the pose detection
      await this.pose.initialize();
      
      console.log('[AIFormService] MediaPipe Pose initialized');
    } catch (error) {
      console.error('[AIFormService] Failed to initialize MediaPipe:', error);
      throw error;
    }
  }

  /**
   * Start camera and pose detection
   */
  async start(config) {
    await this.initialize();
    
    const { exerciseId, mode = 'reps', facingMode = 'user', resolution = { width: 320, height: 240 } } = config;
    
    // Get camera stream
    try {
      // First, enumerate devices to verify camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('[AIFormService] Available video devices:', videoDevices.length);
      videoDevices.forEach((device, i) => {
        console.log(`  Device ${i}: ${device.label || 'Camera ' + i}`);
      });
      
      if (videoDevices.length === 0) {
        throw new Error('No video devices found');
      }
      
      // Use minimal constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.video = document.createElement('video');
      this.video.srcObject = stream;
      this.video.setAttribute('playsinline', true);
      this.video.muted = true;
      
      await new Promise((resolve) => {
        this.video.addEventListener('loadeddata', resolve);
      });
      
      // Ensure video is playing
      this.video.play().catch((err) => {
        console.error('[AIFormService] Video play failed:', err);
      });
      
      // Setup canvas for overlay
      this.canvas = document.createElement('canvas');
      this.canvas.width = resolution.width;
      this.canvas.height = resolution.height;
      this.canvasCtx = this.canvas.getContext('2d');
      
      this.exerciseId = exerciseId;
      this.mode = mode;
      this.isRunning = true;
      this.lastVideoTime = 0;
      this.repCount = 0;
      this.repState = 'up';
      this.formScores = [];
      
      // Register result callback
      this.pose.onResults((results) => {
        console.log('[AIFormService] Pose results received:', results);
        this.handlePoseResults(results);
      });
      
      // Start processing loop
      this.predictLoop();
      
      console.log('[AIFormService] Camera started, pose detection active');
      
      // Expose video element for rendering
      return { video: this.video, canvas: this.canvas };
      
    } catch (error) {
      console.error('[AIFormService] Camera access denied:', error);
      console.error('[AIFormService] Error name:', error.name);
      console.error('[AIFormService] Error message:', error.message);
      throw new Error('Camera access required for AI features: ' + error.message);
    }
  }

  /**
   * Handle pose detection results
   */
  handlePoseResults(results) {
    if (!this.isRunning || !results) return;
    
    console.log('[AIFormService] Pose results received:', results);
    console.log('[AIFormService] Results keys:', Object.keys(results));
    console.log('[AIFormService] Pose landmarks:', results.poseLandmarks);
    console.log('[AIFormService] Pose worldLandmarks:', results.poseWorldLandmarks);
    
    const landmarks = results.poseLandmarks || results.poseWorldLandmarks;
    
    if (!landmarks || landmarks.length === 0) {
      console.log('[AIFormService] No landmarks found in results');
      return;
    }
    
    // Check if pose is valid (enough keypoints visible)
    const validLandmarks = landmarks.filter(l => l.visibility > 0.5);
    const isValid = validLandmarks.length >= 15; // At least 15 keypoints visible
    
    console.log('[AIFormService] Valid landmarks:', validLandmarks.length, 'isValid:', isValid);
    
    // Callback with pose data
    if (this.poseCallback) {
      this.poseCallback({ landmarks, isValid, visibleCount: validLandmarks.length });
    }
    
    // Process form and reps
    if (isValid) {
      this.processPose(landmarks);
    }
  }

  /**
   * Main processing loop - called via requestAnimationFrame
   */
  async predictLoop() {
    if (!this.isRunning || !this.video || !this.pose) return;
    
    // Log video state for debugging
    if (this.lastVideoTime === 0 && this.video.readyState >= 1) {
      console.log('[AIFormService] Video readyState:', this.video.readyState, 'current time:', this.video.currentTime);
    }
    
    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      
      try {
        // Send video frame to MediaPipe for processing
        await this.pose.send({
          image: this.video
        });
        
        // Debug log
        if (this.lastVideoTime % 0.5 < 0.02) {
          console.log('[AIFormService] Frame sent to MediaPipe at', this.lastVideoTime.toFixed(2) + 's');
        }
      } catch (error) {
        console.error('[AIFormService] Error sending frame:', error);
      }
    }
    
    if (this.isRunning) {
      requestAnimationFrame(() => this.predictLoop());
    }
  }

  /**
   * Process pose data for rep counting and form analysis
   */
  processPose(landmarks) {
    const now = Date.now();
    
    // Rep counting based on exercise
    this.countReps(landmarks);
    
    // Form analysis
    const formScore = this.analyzeForm(landmarks);
    if (formScore !== null) {
      this.formScores.push(formScore);
      if (this.formScores.length > this.maxFormScores) {
        this.formScores.shift();
      }
      
      // Check for violations
      const violations = this.checkFormViolations(landmarks);
      if (violations.length > 0 && this.formCallback) {
        violations.forEach(v => {
          // Throttle voice feedback (once per violation type)
          const now = Date.now();
          if (!this.lastViolationTime || now - this.lastViolationTime > 3000) {
            this.formCallback(v);
            this.lastViolationTime = now;
          }
        });
      }
    }
  }

  /**
   * Calculate angle between 3 points using trigonometry
   */
  calculateAngle(p1, p2, p3) {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                   Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  }

  /**
   * Count reps based on joint angles
   */
  countReps(landmarks) {
    if (this.mode !== 'reps') return;
    
    const now = Date.now();
    
    // Different exercises use different joints
    const shoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const elbow = landmarks[LANDMARKS.RIGHT_ELBOW];
    const wrist = landmarks[LANDMARKS.RIGHT_WRIST];
    const hip = landmarks[LANDMARKS.RIGHT_HIP];
    const knee = landmarks[LANDMARKS.RIGHT_KNEE];
    const ankle = landmarks[LANDMARKS.RIGHT_ANKLE];
    
    let angle;
    
    // Push-up: shoulder-elbow-wrist angle
    if (this.exerciseId?.includes('push-up') || this.exerciseId?.includes('flexión')) {
      angle = this.calculateAngle(shoulder, elbow, wrist);
      
      // Rep detection: arm extends (angle > 160)
      if (angle > 160 && this.repState === 'down') {
        this.repState = 'up';
        this.repCount++;
        if (this.repCallback) {
          this.repCallback(this.repCount, { angle, type: 'extension' });
        }
      }
      // Rep detection: arm flexes (angle < 90)
      else if (angle < 90 && this.repState === 'up') {
        this.repState = 'down';
      }
    }
    // Squat: hip-knee-ankle angle
    else if (this.exerciseId?.includes('squat') || this.exerciseId?.includes('sentadilla')) {
      angle = this.calculateAngle(hip, knee, ankle);
      
      // Rep detection: legs extend (angle > 160)
      if (angle > 160 && this.repState === 'down') {
        this.repState = 'up';
        this.repCount++;
        if (this.repCallback) {
          this.repCallback(this.repCount, { angle, type: 'extension' });
        }
      }
      // Rep detection: legs flex (angle < 90)
      else if (angle < 90 && this.repState === 'up') {
        this.repState = 'down';
      }
    }
    // Plank/Hold: track time instead
    else if (this.mode === 'time') {
      // Time tracking handled separately
    }
  }

  /**
   * Analyze form quality (0-100 score)
   */
  analyzeForm(landmarks) {
    const shoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const elbow = landmarks[LANDMARKS.RIGHT_ELBOW];
    const wrist = landmarks[LANDMARKS.RIGHT_WRIST];
    const hip = landmarks[LANDMARKS.RIGHT_HIP];
    const knee = landmarks[LANDMARKS.RIGHT_KNEE];
    const ankle = landmarks[LANDMARKS.RIGHT_ANKLE];
    
    let score = 100;
    
    // Push-up form checks
    if (this.exerciseId?.includes('push-up') || this.exerciseId?.includes('flexión')) {
      const elbowAngle = this.calculateAngle(shoulder, elbow, wrist);
      const spineAngle = this.calculateAngle(shoulder, hip, ankle);
      
      // Check arm extension
      if (elbowAngle > 140 && elbowAngle < 180) {
        score -= 0; // Good extension
      } else if (elbowAngle < 140) {
        score -= 10; // Not fully extended
      }
      
      // Check spine straightness
      if (spineAngle > 160) {
        score -= 0; // Straight back
      } else if (spineAngle < 150) {
        score -= 20; // Sagging back
      }
    }
    
    // Squat form checks
    else if (this.exerciseId?.includes('squat') || this.exerciseId?.includes('sentadilla')) {
      const kneeAngle = this.calculateAngle(hip, knee, ankle);
      
      // Check depth
      if (kneeAngle < 90) {
        score -= 0; // Good depth
      } else if (kneeAngle < 110) {
        score -= 10; // Not deep enough
      } else {
        score -= 20; // Too shallow
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check for specific form violations
   */
  checkFormViolations(landmarks) {
    const violations = [];
    
    const shoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const hip = landmarks[LANDMARKS.RIGHT_HIP];
    const knee = landmarks[LANDMARKS.RIGHT_KNEE];
    const ankle = landmarks[LANDMARKS.RIGHT_ANKLE];
    
    // Push-up violations
    if (this.exerciseId?.includes('push-up') || this.exerciseId?.includes('flexión')) {
      const spineAngle = this.calculateAngle(shoulder, hip, ankle);
      
      if (spineAngle < 150) {
        violations.push({
          type: 'back_sag',
          message_en: 'Keep your core tight! Your hips are sagging.',
          message_es: '¡Mantén el core apretado! Tus caderas están cayendo.'
        });
      }
    }
    
    // Squat violations
    else if (this.exerciseId?.includes('squat') || this.exerciseId?.includes('sentadilla')) {
      const kneeAngle = this.calculateAngle(hip, knee, ankle);
      
      if (kneeAngle > 100) {
        violations.push({
          type: 'shallow_squat',
          message_en: 'Go deeper! Try to get thighs parallel to the ground.',
          message_es: '¡Baja más! Intenta poner los muslos paralelos al suelo.'
        });
      }
    }
    
    return violations;
  }

  /**
   * Get current statistics
   */
  getStats() {
    const avgFormScore = this.formScores.length > 0
      ? this.formScores.reduce((a, b) => a + b, 0) / this.formScores.length
      : 0;
    
    return {
      repCount: this.repCount,
      avgFormScore: Math.round(avgFormScore),
      mode: this.mode,
      exerciseId: this.exerciseId,
      poseValid: this.isRunning
    };
  }

  /**
   * Set callback for pose data
   */
  setPoseCallback(callback) {
    this.poseCallback = callback;
  }

  /**
   * Set callback for form violations
   */
  setFormCallback(callback) {
    this.formCallback = callback;
  }

  /**
   * Set callback for rep updates
   */
  setRepCallback(callback) {
    this.repCallback = callback;
  }

  /**
   * Stop camera and cleanup
   */
  stop() {
    this.isRunning = false;
    
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }
    
    if (this.pose) {
      this.pose.close().catch(() => {});
      this.pose = null;
    }
    
    this.video = null;
    this.canvas = null;
    this.canvasCtx = null;
    
    console.log('[AIFormService] Stopped');
  }

  /**
   * Check if service is currently running
   */
  getIsRunning() {
    return this.isRunning;
  }
}

// Singleton instance
export const aiFormService = new AIFormService();
