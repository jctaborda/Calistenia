import { ACHIEVEMENT_SEVEN_DAYS_MS } from '../constants.js';

import { getState } from './state.js';

// Achievement definitions with emojis and descriptions
const ACHIEVEMENTS = {
  first_workout: {
    id: 'first_workout',
    name: 'First Blood',
    emoji: '🥊',
    description: 'Complete your first workout'
  },
  week_consistent: {
    id: 'week_consistent',
    name: 'Consistent Week',
    emoji: '🔥',
    description: 'Work out 3 times in one week'
  },
  five_workouts: {
    id: 'five_workouts',
    name: 'Five Star',
    emoji: '★',
    description: 'Complete 5 workouts total'
  },
  ten_workouts: {
    id: 'ten_workouts',
    name: 'Ten Strong',
    emoji: '💪',
    description: 'Complete 10 workouts total'
  },
  pushup_master: {
    id: 'pushup_master',
    name: 'Push-Up Master',
    emoji: '🤸',
    description: 'Complete 1000 total push-ups'
  },
  easy_breezy: {
    id: 'easy_breezy',
    name: 'Easy Breezy',
    emoji: '😌',
    description: 'Rate a workout as "Too Easy"'
  },
  challenge_accepted: {
    id: 'challenge_accepted',
    name: 'Challenge Accepted',
    emoji: '😓',
    description: 'Rate a workout as "Too Hard"'
  },
  twenty_workouts: {
    id: 'twenty_workouts',
    name: 'Beast Mode',
    emoji: '🦁',
    description: 'Complete 20 workouts total'
  },
  fifty_workouts: {
    id: 'fifty_workouts',
    name: 'Legend',
    emoji: '👑',
    description: 'Complete 50 workouts total'
  }
};

/**
 * Check for new achievements after workout completion
 */
export function checkAchievements(workoutLog) {
  const state = getState();
  const user = state.user || {};
  const history = state.history || [];
  const unlockedAchievements = user.unlockedAchievements || [];
  
  let newlyUnlocked = [];
  
  // Check first workout achievement
  if (history.length === 1 && !unlockedAchievements.includes('first_workout')) {
    unlockAchievement('first_workout', user);
    newlyUnlocked.push(ACHIEVEMENTS.first_workout);
  }
  
  // Check workout count achievements
  const workoutCount = history.length;
  if (workoutCount >= 5 && !unlockedAchievements.includes('five_workouts')) {
    unlockAchievement('five_workouts', user);
    newlyUnlocked.push(ACHIEVEMENTS.five_workouts);
  }
  if (workoutCount >= 10 && !unlockedAchievements.includes('ten_workouts')) {
    unlockAchievement('ten_workouts', user);
    newlyUnlocked.push(ACHIEVEMENTS.ten_workouts);
  }
  if (workoutCount >= 20 && !unlockedAchievements.includes('twenty_workouts')) {
    unlockAchievement('twenty_workouts', user);
    newlyUnlocked.push(ACHIEVEMENTS.twenty_workouts);
  }
  if (workoutCount >= 50 && !unlockedAchievements.includes('fifty_workouts')) {
    unlockAchievement('fifty_workouts', user);
    newlyUnlocked.push(ACHIEVEMENTS.fifty_workouts);
  }
  
  // Check consistency: 3 workouts in a week (simple check)
  if (workoutCount >= 3 && !unlockedAchievements.includes('week_consistent')) {
    const hasConsistentWeek = checkWeeklyConsistency(history);
    if (hasConsistentWeek) {
      unlockAchievement('week_consistent', user);
      newlyUnlocked.push(ACHIEVEMENTS.week_consistent);
    }
  }
  
  // Check push-up master achievement
  const totalPushups = calculateTotalPushups(history);
  if (totalPushups >= 1000 && !unlockedAchievements.includes('pushup_master')) {
    unlockAchievement('pushup_master', user);
    newlyUnlocked.push(ACHIEVEMENTS.pushup_master);
  }
  
  // Check difficulty feedback achievements
  if (!unlockedAchievements.includes('easy_breezy') && user.lastDifficultyRating === 'too_easy') {
    unlockAchievement('easy_breezy', user);
    newlyUnlocked.push(ACHIEVEMENTS.easy_breezy);
  }
  if (!unlockedAchievements.includes('challenge_accepted') && user.lastDifficultyRating === 'too_hard') {
    unlockAchievement('challenge_accepted', user);
    newlyUnlocked.push(ACHIEVEMENTS.challenge_accepted);
  }
  
  return newlyUnlocked;
}

/**
 * Unlock an achievement for the user
 */
function unlockAchievement(achievementId, user) {
  if (!user.unlockedAchievements) {
    user.unlockedAchievements = [];
  }
  if (!user.unlockedAchievements.includes(achievementId)) {
    user.unlockedAchievements.push(achievementId);
  }
}

/**
 * Check if user has worked out at least 3 times in the last 7 days
 */
function checkWeeklyConsistency(history) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - ACHIEVEMENT_SEVEN_DAYS_MS);
  
  let countInWeek = 0;
  for (const workout of history) {
    const workoutDate = new Date(workout.date);
    if (workoutDate >= sevenDaysAgo && workoutDate <= now) {
      countInWeek++;
    }
  }
  
  return countInWeek >= 3;
}

/**
 * Calculate total push-ups from workout history
 * Uses multiple heuristics to identify push-up exercises:
 * 1. Exercise name contains "push-up" (case insensitive)
 * 2. Skill category is "Push-Up Variations"
 * 3. Exercise ID is 1-13 (based on data.json ordering)
 */
function calculateTotalPushups(history) {
  let total = 0;
  
  for (const workout of history) {
    if (workout.exercises) {
      for (const ex of workout.exercises) {
        // Heuristic 1: Check exercise name for "push-up"
        const nameMatch = ex.exerciseName && ex.exerciseName.toLowerCase().includes('push-up');
        
        // Heuristic 2: Check if skill category is "Push-Up Variations"
        const skillMatch = ex.skill && ex.skill.toLowerCase().includes('push-up');
        
        // Heuristic 3: Check exercise ID range (1-13 are push-up variations in data.json)
        const idMatch = ex.exerciseId && parseInt(ex.exerciseId) >= 1 && parseInt(ex.exerciseId) <= 13;
        
        // Count if any heuristic matches
        if (nameMatch || skillMatch || idMatch) {
          if (ex.actualReps && Array.isArray(ex.actualReps)) {
            total += ex.actualReps.reduce((sum, reps) => sum + reps, 0);
          }
        }
      }
    }
  }
  
  return total;
}

/**
 * Get all unlocked achievements with their details
 */
export function getUnlockedAchievements() {
  const state = getState();
  const user = state.user || {};
  const unlockedIds = user.unlockedAchievements || [];
  
  return unlockedIds.map(id => ACHIEVEMENTS[id]).filter(Boolean);
}

/**
 * Get all available achievements and whether they're unlocked
 */
export function getAllAchievementStatus() {
  const state = getState();
  const user = state.user || {};
  const unlockedIds = user.unlockedAchievements || [];
  
  return Object.values(ACHIEVEMENTS).map(achievement => ({
    ...achievement,
    unlocked: unlockedIds.includes(achievement.id)
  }));
}
