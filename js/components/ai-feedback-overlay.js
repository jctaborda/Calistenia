// AI Feedback Overlay - Canvas overlay for pose visualization and feedback
// Renders skeleton, rep counter, form score, and violation messages
import { t } from '../i18n.js';

export class AIFeedbackOverlay {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.overlayCanvas = null;
    this.overlayCtx = null;
    this.animationId = null;
    this.videoElement = null; // Store video element reference
    
    // Data callbacks
    this.poseData = null;
    this.repCount = 0;
    this.formScore = 0;
    this.violations = [];
    this.mode = 'reps'; // 'reps' or 'time'
    this.elapsedTime = 0;
    
    // Configuration
    this.skeletonColor = '#00FF00';
    this.violationColor = '#FF0000';
    this.textColor = '#FFFFFF';
    this.fontSize = 24;
  }

  /**
   * Initialize overlay canvases
   */
  init(containerId) {
    if (containerId) {
      this.container = document.getElementById(containerId);
    }
    
    if (!this.container) {
      console.error('[AIFeedbackOverlay] Container not found');
      return;
    }
    
    // Create main video canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '5';
    this.canvas.style.visibility = 'visible';
    
    // Create overlay canvas on top
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.width = '100%';
    this.overlayCanvas.style.height = '100%';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.overlayCanvas.style.zIndex = '100'; // Increased from 10 to ensure it's on top
    this.overlayCanvas.style.visibility = 'visible';
    
    this.container.appendChild(this.canvas);
    this.container.appendChild(this.overlayCanvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    setTimeout(() => {
      if (this.canvas.width === 0 || this.canvas.height === 0) {
        this.resize();
      }
    }, 100);
  }

  /**
   * Resize canvases to fit container
   */
  resize() {
    if (!this.container || !this.canvas || !this.overlayCanvas) {
      return;
    }
    
    const rect = this.container.getBoundingClientRect();
    
    // Ensure we have valid dimensions
    const width = rect.width > 0 ? rect.width : 480; // Default to 480px if 0
    const height = rect.height > 0 ? rect.height : 360; // Default to 360px if 0
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.overlayCanvas.width = width;
    this.overlayCanvas.height = height;
    
    if (this.poseData) {
      this.draw();
    }
  }

  /**
   * Set video element to display
   */
  setVideo(video) {
    if (!video) return;
    
    // Store video element reference
    this.videoElement = video;
    
    // Set canvas sizes to match container, not video
    if (this.container) {
      const rect = this.container.getBoundingClientRect();
      const width = rect.width > 0 ? rect.width : 480;
      const height = rect.height > 0 ? rect.height : 360;
      this.canvas.width = width;
      this.canvas.height = height;
      this.overlayCanvas.width = width;
      this.overlayCanvas.height = height;
    }
    
    // Clear and start rendering
    this.draw();
    
    // Start animation loop for continuous rendering
    this.start();
  }

  /**
   * Update pose data and redraw
   */
  setPoseData(data) {
    if (!data || !data.landmarks) {
      return;
    }
    
    this.poseData = data;
    this.draw();
  }

  /**
   * Update rep count
   */
  setRepCount(count) {
    this.repCount = count;
    this.draw();
  }

  /**
   * Update form score
   */
  setFormScore(score) {
    this.formScore = score;
    this.draw();
  }

  /**
   * Set violations
   */
  setViolations(violations) {
    this.violations = violations;
    this.draw();
  }

  /**
   * Set mode (reps or time)
   */
  setMode(mode) {
    this.mode = mode;
    this.draw();
  }

  /**
   * Update elapsed time for timer mode
   */
  setElapsedTime(seconds) {
    this.elapsedTime = seconds;
    this.draw();
  }

  /**
   * Main draw function
   */
  draw() {
    if (!this.overlayCtx || !this.ctx) return;
    
    // Clear both canvases
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    
    // Draw video frame on main canvas
    if (this.videoElement) {
      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Draw pose skeleton if available
    if (this.poseData && this.poseData.landmarks) {
      this.drawSkeleton(this.poseData.landmarks);
    }
    
    // Draw overlay information
    this.drawOverlay();
  }

  /**
   * Draw skeleton connection lines
   */
  drawSkeleton(landmarks) {
    const ctx = this.overlayCtx;
    const color = this.skeletonColor;
    
    if (this.overlayCanvas.width === 0 || this.overlayCanvas.height === 0) {
      return;
    }
    
    // Define connections (simplified skeleton)
    const connections = [
      [11, 12], // shoulders
      [11, 13], // left shoulder to elbow
      [13, 15], // left elbow to wrist
      [12, 14], // right shoulder to elbow
      [14, 16], // right elbow to wrist
      [11, 23], // left shoulder to hip
      [12, 24], // right shoulder to hip
      [23, 24], // hips
      [23, 25], // left hip to knee
      [25, 27], // left knee to ankle
      [24, 26], // right hip to knee
      [26, 28]  // right knee to ankle
    ];
    
    ctx.lineWidth = 5; // Increased from 3 to 5 for better visibility
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw connections
    let drawnCount = 0;
    connections.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      
      if (!p1 || !p2) {
        return;
      }
      
      ctx.beginPath();
      ctx.moveTo(
        p1.x * this.overlayCanvas.width,
        p1.y * this.overlayCanvas.height
      );
      ctx.lineTo(
        p2.x * this.overlayCanvas.width,
        p2.y * this.overlayCanvas.height
      );
      ctx.strokeStyle = this.violations.length > 0 ? this.violationColor : this.skeletonColor;
      ctx.stroke();
      drawnCount++;
    });
    
    ctx.fillStyle = '#00FF00';
    let circleCount = 0;
    landmarks.forEach((point, index) => {
      if ([11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(index)) {
        if (point) {
          ctx.beginPath();
          ctx.arc(
            point.x * this.overlayCanvas.width,
            point.y * this.overlayCanvas.height,
            8, // Increased from 5 to 8 for better visibility
            0,
            Math.PI * 2
          );
          ctx.fill();
          circleCount++;
        }
      }
    });
  }

  /**
   * Draw overlay UI elements
   */
  drawOverlay() {
    const ctx = this.overlayCtx;
    const width = this.overlayCanvas.width;
    const height = this.overlayCanvas.height;
    
    ctx.font = `bold ${this.fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    let yOffset = 10;
    
    // Rep counter or timer
    if (this.mode === 'reps') {
      // Large rep counter
      ctx.font = `bold ${60}px Arial`;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(this.repCount, width - 80, 10);
      ctx.shadowBlur = 0;
      
      ctx.font = `bold ${16}px Arial`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('REPS', width - 60, 50);
    } else {
      // Timer
      const minutes = Math.floor(this.elapsedTime / 60);
      const seconds = Math.floor(this.elapsedTime % 60);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      ctx.font = `bold ${60}px Arial`;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(timeStr, width / 2 - 60, 10);
      ctx.shadowBlur = 0;
    }
    
    // Form score
    ctx.font = `bold ${16}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`${t('ai_form_score')}: ${this.formScore}%`, 10, yOffset);
    yOffset += 25;
    
    // Confidence indicator
    if (this.poseData && this.poseData.isValid !== undefined) {
      const confidence = this.poseData.visibleCount || 0;
      const confidencePercent = Math.round((confidence / 33) * 100);
      
      ctx.fillStyle = confidencePercent > 70 ? '#00FF00' : '#FFFF00';
      ctx.fillText(`${t('ai_confidence')}: ${confidencePercent}%`, 10, yOffset);
      yOffset += 25;
    }
    
    // Violation messages
    if (this.violations.length > 0) {
      ctx.font = `bold ${14}px Arial`;
      ctx.fillStyle = '#FF0000';
      ctx.textAlign = 'center';
      
      this.violations.slice(0, 2).forEach((violation, index) => {
        const message = violation.message_en || violation.message;
        const y = height - 60 + (index * 25);
        ctx.fillText(message, width / 2, y);
      });
    }
  }

  /**
   * Start animation loop
   */
  start() {
    if (this.animationId) return;
    
    const animate = () => {
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Stop animation loop
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Clear overlay
   */
  clear() {
    if (this.overlayCtx) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  /**
   * Destroy overlay
   */
  destroy() {
    this.stop();
    this.clear();
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    if (this.overlayCanvas && this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
    }
    
    this.canvas = null;
    this.overlayCanvas = null;
    this.ctx = null;
    this.overlayCtx = null;
  }
}

// Singleton instance
export const aiFeedbackOverlay = new AIFeedbackOverlay('ai-workout-container');
