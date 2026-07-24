// AI Form Service - Real-time pose detection and form analysis using MediaPipe
// All processing happens in-browser - no video uploads
// Uses local @mediapipe/pose package (v0.5) with .tflite models
// Now config-driven: exercise-specific behavior comes from ai-exercise-config.json

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

// Side-based landmark mapping for config-driven joint lookup
const SIDE_LANDMARKS = {
  right: {
    shoulder: LANDMARKS.RIGHT_SHOULDER,
    elbow: LANDMARKS.RIGHT_ELBOW,
    wrist: LANDMARKS.RIGHT_WRIST,
    hip: LANDMARKS.RIGHT_HIP,
    knee: LANDMARKS.RIGHT_KNEE,
    ankle: LANDMARKS.RIGHT_ANKLE
  },
  left: {
    shoulder: LANDMARKS.LEFT_SHOULDER,
    elbow: LANDMARKS.LEFT_ELBOW,
    wrist: LANDMARKS.LEFT_WRIST,
    hip: LANDMARKS.LEFT_HIP,
    knee: LANDMARKS.LEFT_KNEE,
    ankle: LANDMARKS.LEFT_ANKLE
  }
};

export class AIFormService {
  constructor() {
    this.pose = null;
    this.video = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.isRunning = false;
    this.lastVideoTime = 0;
    this.processingInterval = 100;
    this.poseCallback = null;
    this.formCallback = null;
    this.repCallback = null;

    // Rep counting state
    this.repState = 'up';
    this.repCount = 0;
    this.lastRepTime = 0;
    this.repCooldown = 500;

    // Form tracking
    this.formViolations = [];
    this.formScores = [];
    this.maxFormScores = 50;

    // Config-driven state
    this.aiConfig = null;
    this.sideLandmarks = null;
  }

  /**
   * Initialize the MediaPipe Pose
   */
  async initialize() {
    if (this.pose) return;

    try {
      await import('/assets/mediapipe/pose.js');
      Pose = window.Pose;

      if (!Pose) {
        throw new Error('MediaPipe Pose not found on window object');
      }

      this.pose = new Pose({
        locateFile: (file) => `/assets/mediapipe/${file}`
      });

      await this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      await this.pose.initialize();
    } catch (error) {
      console.error('[AIFormService] Failed to initialize MediaPipe:', error);
      throw error;
    }
  }

  /**
   * Start camera and pose detection
   * @param {Object} config - { exerciseId, aiConfig, mode, facingMode, resolution }
   */
  async start(config) {
    await this.initialize();

    const {
      exerciseId,
      aiConfig = null,
      mode = 'reps',
      facingMode = 'user',
      resolution = { width: 320, height: 240 }
    } = config;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');

      if (videoDevices.length === 0) {
        throw new Error('No video devices found');
      }

      const constraints = {
        video: {
          facingMode,
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

      this.video.play().catch((err) => {
        console.error('[AIFormService] Video play failed:', err);
      });

      this.canvas = document.createElement('canvas');
      this.canvas.width = resolution.width;
      this.canvas.height = resolution.height;
      this.canvasCtx = this.canvas.getContext('2d');

      this.exerciseId = exerciseId;
      this.aiConfig = aiConfig;
      this.mode = mode;
      this.isRunning = true;
      this.lastVideoTime = 0;
      this.repCount = 0;
      this.repState = 'up';
      this.formScores = [];

      // Resolve side landmarks from config
      const side = aiConfig?.repCounting?.side || 'right';
      this.sideLandmarks = SIDE_LANDMARKS[side] || SIDE_LANDMARKS.right;

      this.pose.onResults((results) => {
        this.handlePoseResults(results);
      });

      this.predictLoop();

      return { video: this.video, canvas: this.canvas };
    } catch (error) {
      console.error('[AIFormService] Camera access denied:', error);
      throw new Error('Camera access required for AI features: ' + error.message);
    }
  }

  /**
   * Handle pose detection results
   */
  handlePoseResults(results) {
    if (!this.isRunning || !results) return;

    const landmarks = results.poseLandmarks || results.poseWorldLandmarks;

    if (!landmarks || landmarks.length === 0) {
      return;
    }

    const validLandmarks = landmarks.filter((l) => l.visibility > 0.5);
    const isValid = validLandmarks.length >= 15;

    if (this.poseCallback) {
      this.poseCallback({ landmarks, isValid, visibleCount: validLandmarks.length });
    }

    if (isValid) {
      this.processPose(landmarks);
    }
  }

  /**
   * Main processing loop
   */
  async predictLoop() {
    if (!this.isRunning || !this.video || !this.pose) return;

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;

      try {
        await this.pose.send({ image: this.video });
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
    this.countReps(landmarks);

    const formScore = this.analyzeForm(landmarks);
    if (formScore !== null) {
      this.formScores.push(formScore);
      if (this.formScores.length > this.maxFormScores) {
        this.formScores.shift();
      }

      const violations = this.checkFormViolations(landmarks);
      if (violations.length > 0 && this.formCallback) {
        violations.forEach((v) => {
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
    const radians =
      Math.atan2(p3.y - p2.y, p3.x - p2.x) -
      Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  }

  /**
   * Get a landmark by config joint name (pointA, vertex, pointB)
   */
  _getJointLandmark(landmarks, jointId) {
    return landmarks[jointId];
  }

  /**
   * Count reps based on config-driven joint angles
   */
  countReps(landmarks) {
    if (this.mode !== 'reps') return;
    if (!this.aiConfig?.repCounting?.enabled) return;

    const rc = this.aiConfig.repCounting;
    const pA = this._getJointLandmark(landmarks, rc.joints.pointA);
    const vertex = this._getJointLandmark(landmarks, rc.joints.vertex);
    const pB = this._getJointLandmark(landmarks, rc.joints.pointB);

    if (!pA || !vertex || !pB) return;

    const angle = this.calculateAngle(pA, vertex, pB);

    const countDirection = rc.countDirection || 'extend';

    if (countDirection === 'flex') {
      if (angle < rc.thresholds.flex && this.repState === 'up') {
        this.repState = 'down';
        this.repCount++;
        if (this.repCallback) {
          this.repCallback(this.repCount, { angle, type: rc.type });
        }
      } else if (angle > rc.thresholds.extend && this.repState === 'down') {
        this.repState = 'up';
      }
    } else {
      if (angle > rc.thresholds.extend && this.repState === 'down') {
        this.repState = 'up';
        this.repCount++;
        if (this.repCallback) {
          this.repCallback(this.repCount, { angle, type: rc.type });
        }
      } else if (angle < rc.thresholds.flex && this.repState === 'up') {
        this.repState = 'down';
      }
    }
  }

  /**
   * Analyze form quality (0-100 score) using config-driven rules
   */
  analyzeForm(landmarks) {
    if (!this.aiConfig?.formAnalysis?.rules) return 100;

    let score = 100;

    for (const rule of this.aiConfig.formAnalysis.rules) {
      const pA = this._getJointLandmark(landmarks, rule.joints.pointA);
      const vertex = this._getJointLandmark(landmarks, rule.joints.vertex);
      const pB = this._getJointLandmark(landmarks, rule.joints.pointB);

      if (!pA || !vertex || !pB) continue;

      const angle = this.calculateAngle(pA, vertex, pB);

      if (rule.ranges) {
        // Multi-range penalty system (e.g., squat depth)
        for (const range of rule.ranges) {
          if (angle <= range.max) {
            score -= range.penalty;
            break;
          }
        }
      } else if (rule.goodRange) {
        // Simple good range check (e.g., arm extension, spine alignment)
        if (angle < rule.goodRange[0] || angle > rule.goodRange[1]) {
          score -= rule.penalty;
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check for specific form violations using config-driven rules
   */
  checkFormViolations(landmarks) {
    const violations = [];
    if (!this.aiConfig?.formAnalysis?.rules) return violations;

    for (const rule of this.aiConfig.formAnalysis.rules) {
      if (!rule.violation) continue;

      const pA = this._getJointLandmark(landmarks, rule.joints.pointA);
      const vertex = this._getJointLandmark(landmarks, rule.joints.vertex);
      const pB = this._getJointLandmark(landmarks, rule.joints.pointB);

      if (!pA || !vertex || !pB) continue;

      const angle = this.calculateAngle(pA, vertex, pB);
      const v = rule.violation;

      const triggered =
        (v.compare === 'below' && angle < v.threshold) ||
        (v.compare === 'above' && angle > v.threshold);

      if (triggered) {
        violations.push({
          type: v.type,
          message_en: v.message_en,
          message_es: v.message_es
        });
      }
    }

    return violations;
  }

  /**
   * Get current statistics
   */
  getStats() {
    const avgFormScore =
      this.formScores.length > 0
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
      this.video.srcObject.getTracks().forEach((track) => track.stop());
      this.video.srcObject = null;
    }

    if (this.pose) {
      this.pose.close().catch(() => {});
      this.pose = null;
    }

    this.video = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.aiConfig = null;
    this.sideLandmarks = null;
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
