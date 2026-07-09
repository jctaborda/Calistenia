/**
 * InstallPromptService - Handles PWA installation prompts and tracking
 * Manages beforeinstallprompt events and tracks install analytics
 */

const INSTALL_PROMPT_STORAGE_KEY = 'pwa_install_prompt_shown';
const INSTALL_EVENT_STORAGE_KEY = 'pwa_install_event';
const ENGAGEMENT_THRESHOLD = 3; // Number of visits before showing install prompt

class InstallPromptService {
  constructor() {
    this.deferredPrompt = null;
    this.installShown = false;
    this.visitCount = this.getVisitCount();
    this.userEngaged = false;
  }

  /**
   * Initialize service - attach event listeners
   */
  init() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[InstallPromptService] beforeinstallprompt event fired');
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      this.checkEngagementAndShowPrompt();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('[InstallPromptService] App was installed');
      this.trackInstall();
      this.deferredPrompt = null;
    });

    // Track user engagement (workouts, exercise views, etc.)
    this.trackUserEngagement();

    // Check if we should show the prompt on subsequent visits
    this.checkEngagementAndShowPrompt();
  }

  /**
   * Get visit count from localStorage
   */
  getVisitCount() {
    const count = localStorage.getItem('pwa_visit_count');
    const newCount = count ? parseInt(count, 10) + 1 : 1;
    localStorage.setItem('pwa_visit_count', newCount);
    return newCount;
  }

  /**
   * Track user engagement actions
   */
  trackUserEngagement() {
    // Listen for workout completion (high engagement signal)
    document.addEventListener('workoutCompleted', () => {
      this.userEngaged = true;
      this.checkEngagementAndShowPrompt();
    });

    // Listen for exercise views (medium engagement signal)
    document.addEventListener('exerciseViewed', () => {
      this.checkEngagementAndShowPrompt();
    });

    // Listen for routine starts (medium engagement signal)
    document.addEventListener('routineStarted', () => {
      this.checkEngagementAndShowPrompt();
    });
  }

  /**
   * Check if engagement threshold is met and show prompt
   */
  checkEngagementAndShowPrompt() {
    // Only show if:
    // 1. We have a deferred prompt (browser supports installation)
    // 2. We haven't already shown the prompt
    // 3. We've met engagement threshold (visits or user actions)
    if (!this.deferredPrompt || this.installShown) {
      return;
    }

    // Show prompt if user has engaged OR we've hit visit threshold
    if (this.userEngaged || this.visitCount >= ENGAGEMENT_THRESHOLD) {
      console.log('[InstallPromptService] Showing install prompt (engagement:', this.userEngaged, ', visits:', this.visitCount, ')');
      this.showInstallPrompt();
    }
  }

  /**
   * Show the install prompt
   */
  async showInstallPrompt() {
    if (!this.deferredPrompt || this.installShown) {
      return false;
    }

    this.installShown = true;
    localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, 'true');

    try {
      // Display custom install UI (you should implement this in your view)
      this.promptUser();

      // Wait for user decision
      const choice = await this.waitForUserChoice();

      if (choice === 'accepted') {
        console.log('[InstallPromptService] User accepted the install prompt');
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log('[InstallPromptService] User choice:', outcome);
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('[InstallPromptService] User dismissed the install prompt');
        return false;
      }
    } catch (err) {
      console.error('[InstallPromptService] Error showing install prompt:', err);
      return false;
    }
  }

  /**
   * Prompt user with custom UI - override this to show your own banner/modal
   */
  promptUser() {
    console.log('[InstallPromptService] Prompting user to install');
    // Dispatch event that views can listen to
    document.dispatchEvent(new CustomEvent('pwaInstallPrompt', {
      detail: { message: 'Install Calisthenics Mastery for offline access!' }
    }));
  }

  /**
   * Wait for user to accept or dismiss the prompt
   */
  waitForUserChoice() {
    return new Promise((resolve) => {
      // Set a timeout in case user never responds
      const timeout = setTimeout(() => {
        console.log('[InstallPromptService] Install prompt timeout');
        resolve('dismissed');
      }, 30000); // 30 second timeout

      // Store the resolver for the prompt to use
      this.installChoiceResolver = resolve;
      this.installTimeout = timeout;
    });
  }

  /**
   * Handle user's install choice
   */
  handleInstallChoice(choice) {
    if (this.installChoiceResolver) {
      clearTimeout(this.installTimeout);
      this.installChoiceResolver(choice);
      this.installChoiceResolver = null;
      this.installTimeout = null;
    }
  }

  /**
   * Track installation event for analytics
   */
  trackInstall() {
    const installData = {
      timestamp: Date.now(),
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    localStorage.setItem(INSTALL_EVENT_STORAGE_KEY, JSON.stringify(installData));
    
    // Dispatch analytics event
    document.dispatchEvent(new CustomEvent('pwaInstallTrack', {
      detail: installData
    }));
  }

  /**
   * Get analytics data
   */
  getAnalytics() {
    const visitCount = this.visitCount;
    const installShown = localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY) === 'true';
    const installEvent = localStorage.getItem(INSTALL_EVENT_STORAGE_KEY);
    const installed = this.isAppInstalled();

    return {
      visitCount,
      installShown,
      installEvent: installEvent ? JSON.parse(installEvent) : null,
      installed,
      conversionRate: installEvent ? (installShown ? (1 / installShown * 100).toFixed(2) : 0) + '%' : '0%'
    };
  }

  /**
   * Check if app is installed (standalone mode)
   */
  isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  /**
   * Reset install prompt state (for testing)
   */
  reset() {
    this.deferredPrompt = null;
    this.installShown = false;
    localStorage.removeItem(INSTALL_PROMPT_STORAGE_KEY);
    localStorage.removeItem('pwa_visit_count');
  }
}

// Export singleton instance
export const installPromptService = new InstallPromptService();

// Export for direct use in views
export default installPromptService;
