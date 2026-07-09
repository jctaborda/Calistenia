/**
 * ProgressTrackingService - Handles progress tracking, analytics, and 1RM calculations
 */

export class ProgressTrackingService {
  constructor() {
    this.history = [];
  }

  /**
   * Get workout history from state
   */
  async getHistory() {
    const { getState } = await import('./state.js');
    const state = await getState();
    return state.history || [];
  }

  /**
   * Calculate 1RM (One Rep Max) using the Epley formula
   * 1RM = weight * (1 + reps/30)
   * @param {number} weight - Weight lifted in kg
   * @param {number} reps - Number of reps completed
   * @returns {number} Estimated 1RM
   */
  calculate1RM(weight, reps) {
    if (reps < 1 || reps > 20) {
      // Epley formula is most accurate for 1-20 reps
      return null;
    }
    return Math.round(weight * (1 + reps / 30));
  }

  /**
   * Get exercise history from workout history
   * @param {number} exerciseId - Exercise ID
   * @returns {Array} Array of workout entries for this exercise
   */
  async getExerciseHistory(exerciseId) {
    const history = await this.getHistory();
    const exerciseHistory = [];

    history.forEach(workout => {
      if (workout.sections) {
        workout.sections.forEach(section => {
          section.exercises.forEach(ex => {
            if (ex.exerciseId === exerciseId) {
              exerciseHistory.push({
                date: workout.date,
                sets: ex.sets,
                reps: ex.reps,
                weight: ex.weight,
                workoutId: workout.id
              });
            }
          });
        });
      }
    });

    // Sort by date descending
    return exerciseHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Get 1RM estimate for an exercise based on history
   * @param {number} exerciseId - Exercise ID
   * @returns {Object} 1RM stats
   */
  async getExercise1RM(exerciseId) {
    const history = await this.getExerciseHistory(exerciseId);
    
    if (history.length === 0) {
      return {
        estimated1RM: null,
        maxWeight: null,
        maxReps: null,
        best1RM: null,
        attempts: 0
      };
    }

    let maxWeight = 0;
    let maxReps = 0;
    let best1RM = 0;
    let best1RMData = null;

    history.forEach(entry => {
      const weight = parseFloat(entry.weight) || 0;
      const reps = parseInt(entry.reps) || 0;

      if (weight > maxWeight) maxWeight = weight;
      if (reps > maxReps) maxReps = reps;

      const estimated1RM = this.calculate1RM(weight, reps);
      if (estimated1RM && estimated1RM > best1RM) {
        best1RM = estimated1RM;
        best1RMData = { weight, reps, date: entry.date };
      }
    });

    return {
      estimated1RM: best1RM > 0 ? best1RM : null,
      maxWeight: maxWeight > 0 ? maxWeight : null,
      maxReps: maxReps > 0 ? maxReps : null,
      best1RM: best1RM > 0 ? best1RM : null,
      best1RMData: best1RMData,
      attempts: history.length
    };
  }

  /**
   * Get progression data for an exercise (last 10 entries)
   * @param {number} exerciseId - Exercise ID
   * @returns {Array} Progression data points
   */
  async getExerciseProgression(exerciseId) {
    const history = await this.getExerciseHistory(exerciseId);
    
    // Get last 10 entries sorted by date ascending
    const last10 = history.slice(0, 10).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return last10.map(entry => ({
      date: entry.date,
      weight: parseFloat(entry.weight) || 0,
      reps: parseInt(entry.reps) || 0,
      volume: (parseFloat(entry.weight) || 0) * parseInt(entry.reps) * parseInt(entry.sets) || 0
    }));
  }

  /**
   * Check if user should progress an exercise
   * Suggests progression when user can do 3+ reps over target in last 2 workouts
   * @param {number} exerciseId - Exercise ID
   * @param {number} targetReps - Target rep range (e.g., 8-12)
   * @returns {Object} Progression recommendation
   */
  async shouldProgressExercise(exerciseId, targetReps = 10) {
    const history = await this.getExerciseHistory(exerciseId);
    
    if (history.length < 2) {
      return { shouldProgress: false, reason: 'Not enough data' };
    }

    // Get last 2 workouts
    const last2 = history.slice(0, 2);
    const avgReps = last2.reduce((sum, entry) => sum + parseInt(entry.reps), 0) / last2.length;

    if (avgReps >= targetReps + 2) {
      return {
        shouldProgress: true,
        reason: `You're averaging ${Math.round(avgReps)} reps. Consider increasing weight!`,
        avgReps: Math.round(avgReps)
      };
    }

    return { shouldProgress: false, reason: 'Keep training at current weight' };
  }

  /**
   * Calculate weekly volume (total reps * weight) for all exercises
   * @param {number} weeks - Number of weeks to look back (default: 4)
   * @returns {Array} Weekly volume data points
   */
  async getWeeklyVolume(weeks = 4) {
    const history = await this.getHistory();
    const now = new Date();
    const weeklyData = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      let totalVolume = 0;
      let totalWorkouts = 0;

      history.forEach(workout => {
        const workoutDate = new Date(workout.date);
        if (workoutDate >= weekStart && workoutDate < weekEnd) {
          if (workout.sections) {
            workout.sections.forEach(section => {
              section.exercises.forEach(ex => {
                const weight = parseFloat(ex.weight) || 0;
                const reps = parseInt(ex.reps) || 0;
                const sets = parseInt(ex.sets) || 0;
                totalVolume += weight * reps * sets;
              });
            });
          }
          totalWorkouts++;
        }
      });

      weeklyData.unshift({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        volume: totalVolume,
        workouts: totalWorkouts
      });
    }

    return weeklyData;
  }

  /**
   * Get workout duration trends
   * @param {number} limit - Number of recent workouts to analyze (default: 8)
   * @returns {Object} Duration statistics and trend data
   */
  async getWorkoutDurationTrends(limit = 8) {
    const history = await this.getHistory();
    
    if (history.length === 0) {
      return {
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        workoutsCount: 0,
        trendData: []
      };
    }

    // Get last N workouts sorted by date
    const sortedHistory = history
      .filter(w => w.setHistory && w.setHistory.length > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    if (sortedHistory.length === 0) {
      return {
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        workoutsCount: 0,
        trendData: []
      };
    }

    // Calculate duration stats
    const durations = sortedHistory.map(workout => {
      const totalWorkTime = (workout.setHistory || []).reduce((sum, set) => sum + (set.duration || 0), 0);
      const totalRestTime = (workout.setHistory || []).reduce((sum, set) => sum + (set.actualRestTime || 0), 0);
      return totalWorkTime + totalRestTime;
    });

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    // Create trend data (sorted ascending by date for chart)
    const trendData = sortedHistory
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(workout => {
        const totalWorkTime = (workout.setHistory || []).reduce((sum, set) => sum + (set.duration || 0), 0);
        const totalRestTime = (workout.setHistory || []).reduce((sum, set) => sum + (set.actualRestTime || 0), 0);
        return {
          date: workout.date,
          duration: totalWorkTime + totalRestTime
        };
      });

    return {
      avgDuration,
      maxDuration,
      minDuration,
      workoutsCount: durations.length,
      trendData
    };
  }

  /**
   * Calculate exercise PRs (Personal Records)
   * @returns {Array} All exercise PRs
   */
  async getExercisePRs() {
    const { getState } = await import('./state.js');
    const state = await getState();
    const exercises = state.exercises || [];
    const history = await this.getHistory();

    const prs = [];

    exercises.forEach(exercise => {
      let maxWeight = 0;
      let maxReps = 0;
      let maxVolume = 0;
      let bestWorkout = null;

      history.forEach(workout => {
        if (workout.sections) {
          workout.sections.forEach(section => {
            section.exercises.forEach(exEntry => {
              if (exEntry.exerciseId === exercise.id) {
                const weight = parseFloat(exEntry.weight) || 0;
                const reps = parseInt(exEntry.reps) || 0;
                const sets = parseInt(exEntry.sets) || 0;
                const volume = weight * reps * sets;

                if (weight > maxWeight) {
                  maxWeight = weight;
                  maxReps = reps;
                  maxVolume = volume;
                  bestWorkout = { date: workout.date, sets, reps, weight };
                }
              }
            });
          });
        }
      });

      if (maxWeight > 0) {
        const estimated1RM = this.calculate1RM(maxWeight, maxReps);
        prs.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          maxWeight: maxWeight,
          maxReps: maxReps,
          maxVolume: maxVolume,
          estimated1RM: estimated1RM,
          date: bestWorkout.date
        });
      }
    });

    // Sort by estimated 1RM descending
    return prs.sort((a, b) => (b.estimated1RM || 0) - (a.estimated1RM || 0));
  }

  /**
   * Calculate muscle group balance
   * @returns {Object} Muscle group stats
   */
  async getMuscleGroupBalance() {
    const { getState } = await import('./state.js');
    const state = await getState();
    const muscles = state.muscles || [];
    const history = await this.getHistory();

    const muscleStats = {};
    muscles.forEach(m => {
      muscleStats[m.id] = {
        name: m.name,
        volume: 0,
        workouts: 0
      };
    });

    history.forEach(workout => {
      if (workout.sections) {
        workout.sections.forEach(section => {
          section.exercises.forEach(exEntry => {
            // Get exercise details
            const exercise = state.exercises?.find(e => e.id === exEntry.exerciseId);
            if (exercise && exercise.muscles) {
              const weight = parseFloat(exEntry.weight) || 0;
              const reps = parseInt(exEntry.reps) || 0;
              const sets = parseInt(exEntry.sets) || 0;
              const volume = weight * reps * sets;

              exercise.muscles.forEach(muscleId => {
                if (muscleStats[muscleId]) {
                  muscleStats[muscleId].volume += volume;
                  muscleStats[muscleId].workouts += 1;
                }
              });
            }
          });
        });
      }
    });

    // Calculate percentages
    const totalVolume = Object.values(muscleStats).reduce((sum, m) => sum + m.volume, 0);
    const muscleBalance = {};

    Object.keys(muscleStats).forEach(id => {
      const muscle = muscleStats[id];
      muscleBalance[id] = {
        ...muscle,
        percentage: totalVolume > 0 ? Math.round((muscle.volume / totalVolume) * 100) : 0
      };
    });

    return muscleBalance;
  }

  /**
   * Get streak data from history
   * @returns {Object} Streak statistics
   */
  async getStreakData() {
    const history = await this.getHistory();

    if (history.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        totalWorkouts: 0
      };
    }

    // Sort by date descending
    const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate current streak (consecutive days from most recent workout)
    let currentStreak = 0;
    let longestStreak = 0;
    let lastWorkoutDate = null;

    const dates = sortedHistory.map(w => new Date(w.date).getTime());
    let streakDays = new Set();

    dates.forEach(timestamp => {
      const dayKey = new Date(timestamp).toDateString();
      streakDays.add(dayKey);
    });

    longestStreak = streakDays.size;

    // Current streak
    const now = new Date();
    let dayIndex = 0;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    while (true) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - dayIndex);
      const checkKey = checkDate.toDateString();

      if (streakDays.has(checkKey)) {
        currentStreak++;
        dayIndex++;
      } else {
        break;
      }
    }

    lastWorkoutDate = sortedHistory[0].date;

    return {
      currentStreak,
      longestStreak,
      lastWorkoutDate,
      totalWorkouts: history.length
    };
  }

  /**
   * Generate chart data for progress tracking
   * @param {string} chartType - Type of chart: 'weekly-volume', 'exercise-pr', 'muscle-balance'
   * @param {number} exerciseId - Optional exercise ID for exercise-specific charts
   * @returns {Object} Chart data
   */
  async getChartData(chartType, exerciseId = null) {
    switch (chartType) {
      case 'weekly-volume':
        const weeklyVolume = await this.getWeeklyVolume(4);
        return {
          type: 'line',
          title: 'Weekly Volume',
          labels: weeklyVolume.map(w => `Week of ${w.weekStart.slice(5)}`),
          datasets: [{
            label: 'Total Volume (kg)',
            data: weeklyVolume.map(w => w.volume),
            borderColor: 'rgba(76, 175, 80, 1)',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4
          }]
        };

      case 'exercise-pr':
        const prs = await this.getExercisePRs();
        const topPRs = prs.slice(0, 10);
        return {
          type: 'bar',
          title: 'Top Exercise PRs (1RM)',
          labels: topPRs.map(pr => pr.exerciseName),
          datasets: [{
            label: 'Estimated 1RM (kg)',
            data: topPRs.map(pr => pr.estimated1RM || 0),
            backgroundColor: 'rgba(33, 150, 243, 0.6)'
          }]
        };

      case 'muscle-balance':
        const muscleBalance = await this.getMuscleGroupBalance();
        const muscleData = Object.values(muscleBalance)
          .filter(m => m.volume > 0)
          .sort((a, b) => b.volume - a.volume);
        return {
          type: 'doughnut',
          title: 'Muscle Group Balance',
          labels: muscleData.map(m => m.name),
          datasets: [{
            data: muscleData.map(m => m.percentage),
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)',
              'rgba(199, 199, 199, 0.8)',
              'rgba(83, 102, 255, 0.8)'
            ]
          }]
        };

      case 'duration-trends':
        const durationTrends = await this.getWorkoutDurationTrends(8);
        const durationLabels = durationTrends.trendData.map(d => {
          const date = new Date(d.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        return {
          type: 'line',
          title: 'Workout Duration Trends',
          labels: durationLabels,
          datasets: [{
            label: 'Duration (minutes)',
            data: durationTrends.trendData.map(d => Math.round(d.duration / 60)),
            borderColor: 'rgba(156, 39, 176, 1)',
            backgroundColor: 'rgba(156, 39, 176, 0.1)',
            tension: 0.1
          }]
        };

      case 'exercise-progression':
        if (!exerciseId) {
          return { error: 'exerciseId required for exercise progression' };
        }
        const progression = await this.getExerciseProgression(exerciseId);
        return {
          type: 'line',
          title: `Progression: ${this.getExerciseName(exerciseId)}`,
          labels: progression.map(p => new Date(p.date).toLocaleDateString()),
          datasets: [
            {
              label: 'Weight (kg)',
              data: progression.map(p => p.weight),
              borderColor: 'rgba(76, 175, 80, 1)',
              tension: 0.1
            },
            {
              label: 'Volume (kg)',
              data: progression.map(p => p.volume),
              borderColor: 'rgba(33, 150, 243, 1)',
              tension: 0.1
            }
          ]
        };

      default:
        return { error: 'Unknown chart type' };
    }
  }

  /**
   * Get exercise name by ID (helper)
   */
  async getExerciseName(exerciseId) {
    const { getState } = await import('./state.js');
    const state = await getState();
    const exercise = state.exercises?.find(e => e.id === exerciseId);
    return exercise?.name || 'Unknown Exercise';
  }
}

// Export singleton instance
export const progressTrackingService = new ProgressTrackingService();
