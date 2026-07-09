/**
 * NotificationService - Handles all notification functionality for the app
 * Includes: rest timer notifications, streak reminders, and scheduled workout reminders
 */

export class NotificationService {
  constructor() {
    this.permission = null;
    this.restTimerNotification = null;
    this.streakReminderNotification = null;
    this.scheduledWorkoutNotification = null;
  }

  /**
   * Request notification permission and store it
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return 'not_supported';
    }

    if (this.permission === null) {
      try {
        this.permission = await Notification.requestPermission();
        console.log(`Notification permission: ${this.permission}`);
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        this.permission = 'denied';
      }
    }
    return this.permission;
  }

  /**
   * Check if notifications are supported and permitted
   */
  areNotificationsEnabled() {
    return this.permission === 'granted';
  }

  /**
   * Send a rest timer notification (for backgrounded app)
   * @param {Object} workoutData - Current workout/rest information
   */
  sendRestTimerNotification(workoutData) {
    if (!this.areNotificationsEnabled()) return;

    const { exerciseName, restTime, elapsed } = workoutData;

    // Only notify when rest time is complete (elapsed >= restTime)
    if (elapsed >= restTime) {
      const notification = new Notification('Rest Complete!', {
        body: `Time to start: ${exerciseName}`,
        icon: 'assets/icons/favicon-192x192.png',
        badge: 'assets/icons/favicon-32x32.png',
        tag: `rest-timer-${Date.now()}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        window.location.hash = '#active-workout';
        notification.close();
      };

      this.restTimerNotification = notification;
    }
  }

  /**
   * Send a workout streak reminder notification
   * @param {Object} streakData - Streak information from history
   */
  sendStreakReminderNotification(streakData) {
    if (!this.areNotificationsEnabled()) return;

    const { currentStreak, longestStreak, lastWorkoutDate } = streakData;

    let bodyText = `Current streak: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}!`;
    if (longestStreak > currentStreak) {
      bodyText += ` Longest: ${longestStreak} days`;
    }
    if (lastWorkoutDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastWorkoutDate)) / (1000 * 60 * 60 * 24));
      if (daysSince >= 2) {
        bodyText += ` - You haven't worked out in ${daysSince} days!`;
      }
    }

    const notification = new Notification('Workout Streak Reminder', {
      body: bodyText,
      icon: 'assets/icons/favicon-192x192.png',
      badge: 'assets/icons/favicon-32x32.png',
      tag: 'streak-reminder',
      requireInteraction: false,
      data: { type: 'streak-reminder' }
    });

    notification.onclick = () => {
      window.focus();
      window.location.hash = '#home';
      notification.close();
    };

    this.streakReminderNotification = notification;
  }

  /**
   * Send a scheduled workout reminder
   * @param {Object} routineData - Routine information
   * @param {Date} scheduledDate - When the workout was scheduled for
   */
  sendScheduledWorkoutReminder(routineData, scheduledDate) {
    if (!this.areNotificationsEnabled()) return;

    const notification = new Notification('Scheduled Workout Time!', {
      body: `Time for: ${routineData.name}`,
      icon: 'assets/icons/favicon-192x192.png',
      badge: 'assets/icons/favicon-32x32.png',
      tag: `scheduled-workout-${scheduledDate.getTime()}`,
      requireInteraction: false,
      data: { type: 'scheduled-workout', routineId: routineData.id }
    });

    notification.onclick = () => {
      window.focus();
      window.location.hash = `#routine-details/routine/${routineData.id}`;
      notification.close();
    };

    this.scheduledWorkoutNotification = notification;
  }

  /**
   * Schedule a rest timer notification using Service Worker
   * This works even when the app is backgrounded
   * @param {number} delaySeconds - When to send the notification (in seconds from now)
   * @param {Object} workoutData - Workout/rest information
   */
  scheduleRestTimerNotification(delaySeconds, workoutData) {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    // Send message to Service Worker to schedule notification
    navigator.serviceWorker.ready.then(registration => {
      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        delaySeconds: delaySeconds,
        workoutData: workoutData,
        notificationType: 'rest-timer'
      });
    }).catch(error => {
      console.error('Failed to send message to Service Worker:', error);
    });
  }

  /**
   * Schedule a streak reminder notification
   * @param {number} delaySeconds - When to send the notification
   * @param {Object} streakData - Streak information
   */
  scheduleStreakReminder(delaySeconds, streakData) {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    navigator.serviceWorker.ready.then(registration => {
      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        delaySeconds: delaySeconds,
        streakData: streakData,
        notificationType: 'streak-reminder'
      });
    }).catch(error => {
      console.error('Failed to send message to Service Worker:', error);
    });
  }

  /**
   * Schedule a routine reminder notification
   * @param {number} delaySeconds - When to send the notification
   * @param {Object} routineData - Routine information
   */
  scheduleRoutineReminder(delaySeconds, routineData) {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    navigator.serviceWorker.ready.then(registration => {
      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        delaySeconds: delaySeconds,
        routineData: routineData,
        notificationType: 'routine-reminder'
      });
    }).catch(error => {
      console.error('Failed to send message to Service Worker:', error);
    });
  }

  /**
   * Cancel all scheduled notifications
   */
  cancelAllNotifications() {
    if (this.restTimerNotification) {
      this.restTimerNotification.close();
      this.restTimerNotification = null;
    }
    if (this.streakReminderNotification) {
      this.streakReminderNotification.close();
      this.streakReminderNotification = null;
    }
    if (this.scheduledWorkoutNotification) {
      this.scheduledWorkoutNotification.close();
      this.scheduledWorkoutNotification = null;
    }
  }

  /**
   * Clean up notifications when leaving a view
   */
  cleanup() {
    this.cancelAllNotifications();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
