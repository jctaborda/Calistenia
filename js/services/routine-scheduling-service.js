/**
 * RoutineSchedulingService - Handles scheduled workouts and reminders
 */

export class RoutineSchedulingService {
  constructor() {
    this.scheduledWorkouts = [];
    this.reminderInterval = null;
  }

  /**
   * Get state to access routines and history
   */
  async getState() {
    const { getState } = await import('./state.js');
    return await getState();
  }

  /**
   * Schedule a workout
   * @param {Object} routine - Routine to schedule
   * @param {Date} scheduledDate - When to perform the workout
   * @param {string} dayOfWeek - Day of week (0-6, 0=Sunday) for recurring
   * @param {boolean} recurring - Whether this is a recurring schedule
   */
  async scheduleWorkout(routine, scheduledDate = null, dayOfWeek = null, recurring = false) {
    const { routines } = await this.getState();
    const routineToSchedule = routines.find(r => r.id === routine.id) || routine;

    const schedule = {
      id: Date.now(),
      routineId: routineToSchedule.id,
      routineName: routineToSchedule.name,
      scheduledDate: scheduledDate || new Date(),
      dayOfWeek: dayOfWeek, // For recurring schedules
      recurring: recurring,
      notified: false,
      completed: false,
      createdAt: new Date().toISOString()
    };

    this.scheduledWorkouts.push(schedule);
    this.saveScheduledWorkouts();

    // Set reminder if not recurring
    if (!recurring && scheduledDate) {
      this.setReminder(schedule);
    }

    return schedule;
  }

  /**
   * Set a notification reminder for a scheduled workout
   * @param {Object} schedule - Scheduled workout
   */
  async setReminder(schedule) {
    const { notificationService } = await import('./notification-service.js');
    
    if (!notificationService.areNotificationsEnabled()) return;

    const now = new Date();
    const scheduled = new Date(schedule.scheduledDate);
    const delaySeconds = Math.max(0, (scheduled - now) / 1000);

    if (delaySeconds <= 0) {
      // Already scheduled, send immediately
      this.notifyScheduledWorkout(schedule);
      return;
    }

    // Schedule notification via Service Worker
    notificationService.scheduleRoutineReminder(delaySeconds, {
      id: schedule.routineId,
      name: schedule.routineName
    });
  }

  /**
   * Send notification for scheduled workout
   * @param {Object} schedule - Scheduled workout
   */
  async notifyScheduledWorkout(schedule) {
    const { notificationService } = await import('./notification-service.js');
    
    notificationService.sendScheduledWorkoutReminder(
      { id: schedule.routineId, name: schedule.routineName },
      schedule.scheduledDate
    );

    schedule.notified = true;
    this.saveScheduledWorkouts();
  }

  /**
   * Cancel a scheduled workout
   * @param {number} scheduleId - ID of schedule to cancel
   */
  cancelSchedule(scheduleId) {
    const index = this.scheduledWorkouts.findIndex(s => s.id === scheduleId);
    if (index !== -1) {
      this.scheduledWorkouts.splice(index, 1);
      this.saveScheduledWorkouts();
      return true;
    }
    return false;
  }

  /**
   * Complete a scheduled workout
   * @param {number} scheduleId - ID of schedule to complete
   */
  completeSchedule(scheduleId) {
    const schedule = this.scheduledWorkouts.find(s => s.id === scheduleId);
    if (schedule) {
      schedule.completed = true;
      schedule.completedAt = new Date().toISOString();
      this.saveScheduledWorkouts();
      return schedule;
    }
    return null;
  }

  /**
   * Get upcoming scheduled workouts
   * @param {number} limit - Maximum number to return
   * @returns {Array} Upcoming schedules
   */
  getUpcomingSchedules(limit = 10) {
    const now = new Date();
    const upcoming = this.scheduledWorkouts
      .filter(s => !s.completed && new Date(s.scheduledDate) >= now)
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .slice(0, limit);

    return upcoming;
  }

  /**
   * Get past scheduled workouts
   * @param {number} limit - Maximum number to return
   * @returns {Array} Past schedules
   */
  getPastSchedules(limit = 20) {
    const now = new Date();
    const past = this.scheduledWorkouts
      .filter(s => new Date(s.scheduledDate) < now)
      .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
      .slice(0, limit);

    return past;
  }

  /**
   * Get all schedules
   * @returns {Array} All schedules
   */
  getAllSchedules() {
    return [...this.scheduledWorkouts];
  }

  /**
   * Get scheduled workouts for a specific day
   * @param {Date} date - Date to check
   * @returns {Array} Schedules for that day
   */
  getSchedulesForDay(date) {
    const dayKey = date.toDateString();
    return this.scheduledWorkouts.filter(s => {
      if (s.recurring && s.dayOfWeek !== null) {
        return new Date().getDay() === s.dayOfWeek && !s.completed;
      }
      return new Date(s.scheduledDate).toDateString() === dayKey && !s.completed;
    });
  }

  /**
   * Get recurring schedules
   * @returns {Array} Recurring schedules
   */
  getRecurringSchedules() {
    return this.scheduledWorkouts.filter(s => s.recurring && !s.completed);
  }

  /**
   * Save scheduled workouts to localStorage
   */
  saveScheduledWorkouts() {
    try {
      localStorage.setItem('scheduledWorkouts', JSON.stringify(this.scheduledWorkouts));
    } catch (error) {
      console.error('Failed to save scheduled workouts:', error);
    }
  }

  /**
   * Load scheduled workouts from localStorage
   */
  loadScheduledWorkouts() {
    try {
      const data = localStorage.getItem('scheduledWorkouts');
      if (data) {
        this.scheduledWorkouts = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load scheduled workouts:', error);
      this.scheduledWorkouts = [];
    }
  }

  /**
   * Check for upcoming schedules and send reminders
   */
  async checkAndRemind() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    for (const schedule of this.scheduledWorkouts) {
      if (schedule.completed || schedule.notified) continue;

      let shouldRemind = false;

      if (schedule.recurring && schedule.dayOfWeek === dayOfWeek) {
        // Check if it's a good time to remind (e.g., morning or evening)
        if (hour >= 8 && hour < 22) {
          shouldRemind = true;
        }
      } else if (!schedule.recurring) {
        const scheduled = new Date(schedule.scheduledDate);
        if (scheduled >= now && scheduled < new Date(now.getTime() + 60 * 60 * 1000)) {
          // Scheduled within the next hour
          shouldRemind = true;
        }
      }

      if (shouldRemind) {
        await this.notifyScheduledWorkout(schedule);
      }
    }
  }

  /**
   * Clean up old completed schedules
   */
  cleanupOldSchedules(months = 3) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (months * 30));

    this.scheduledWorkouts = this.scheduledWorkouts.filter(s => {
      const completedAt = s.completedAt ? new Date(s.completedAt) : new Date(s.scheduledDate);
      return !s.completed || completedAt >= cutoffDate;
    });

    this.saveScheduledWorkouts();
  }

  /**
   * Generate calendar view data for a month
   * @param {number} year - Year
   * @param {number} month - Month (0-11)
   * @returns {Object} Calendar data
   */
  generateCalendarData(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const calendar = {};
    
    // Initialize all days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      calendar[i] = {
        date: date.toISOString().split('T')[0],
        schedules: [],
        isToday: date.toDateString() === new Date().toDateString(),
        isPast: date < new Date()
      };
    }

    // Add schedules to calendar days
    this.scheduledWorkouts.forEach(schedule => {
      if (schedule.recurring && schedule.dayOfWeek !== null) {
        // Add to all occurrences of this day of week in the month
        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(year, month, i);
          if (date.getDay() === schedule.dayOfWeek && !schedule.completed) {
            calendar[i].schedules.push({
              ...schedule,
              actualDate: date.toISOString().split('T')[0]
            });
          }
        }
      } else {
        const scheduleDate = new Date(schedule.scheduledDate);
        if (scheduleDate.getMonth() === month && scheduleDate.getFullYear() === year && !schedule.completed) {
          const day = scheduleDate.getDate();
          calendar[day].schedules.push(schedule);
        }
      }
    });

    return {
      year,
      month,
      days: daysInMonth,
      startingDay,
      calendar
    };
  }

  /**
   * Get statistics
   * @returns {Object} Scheduling statistics
   */
  async getStatistics() {
    const now = new Date();
    const completed = this.scheduledWorkouts.filter(s => s.completed);
    const upcoming = this.getUpcomingSchedules();
    const recurring = this.getRecurringSchedules();

    // Calculate completion rate
    const totalScheduled = this.scheduledWorkouts.filter(s => 
      new Date(s.scheduledDate) < now
    );
    const completionRate = totalScheduled.length > 0 
      ? Math.round((completed.filter(c => new Date(c.scheduledDate) < now).length / totalScheduled.length) * 100)
      : 0;

    return {
      totalScheduled: this.scheduledWorkouts.length,
      upcoming: upcoming.length,
      completed: completed.length,
      recurring: recurring.length,
      completionRate,
      thisMonth: completed.filter(c => {
        const date = new Date(c.completedAt || c.scheduledDate);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length
    };
  }
}

// Export singleton instance
export const routineSchedulingService = new RoutineSchedulingService();
