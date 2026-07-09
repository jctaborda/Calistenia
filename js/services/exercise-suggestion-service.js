/**
 * ExerciseSuggestionService - Provides exercise substitution suggestions based on muscle group and difficulty
 */

export class ExerciseSuggestionService {
  /**
   * Get suggested exercises to replace a given exercise
   * @param {number} originalExerciseId - ID of the exercise being replaced
   * @param {Array} exercises - All available exercises
   * @param {number} currentDifficulty - Current exercise difficulty level
   * @returns {Array} Array of suggested exercises
   */
  getSuggestedSubstitutions(originalExerciseId, exercises, currentDifficulty) {
    const originalExercise = exercises.find(e => String(e.id) === String(originalExerciseId));
    
    if (!originalExercise) {
      return [];
    }

    // Get muscle groups targeted by original exercise
    const targetMuscleIds = new Set([
      ...(originalExercise.muscles || []),
      ...(originalExercise.muscles_secondary || [])
    ]);

    // Find exercises that target the same muscle groups
    const matchingExercises = exercises.filter(ex => {
      // Skip the original exercise
      if (String(ex.id) === String(originalExerciseId)) return false;
      
      // Check if exercise targets any of the same muscle groups
      const targetsSameMuscles = 
        (ex.muscles || []).some(muscleId => targetMuscleIds.has(muscleId)) ||
        (ex.muscles_secondary || []).some(muscleId => targetMuscleIds.has(muscleId));
      
      return targetsSameMuscles;
    });

    // Sort by difficulty match first, then by popularity (you could add a popularity metric)
    matchingExercises.sort((a, b) => {
      const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
      const aDiffOrder = difficultyOrder.indexOf(a.difficulty) ?? 999;
      const bDiffOrder = difficultyOrder.indexOf(b.difficulty) ?? 999;
      
      // Prioritize same difficulty
      if (a.difficulty === b.difficulty) {
        return 0;
      }
      
      // If current is intermediate, prefer beginner or advanced equally
      if (currentDifficulty === 'intermediate') {
        const aDistance = Math.abs(aDiffOrder - difficultyOrder.indexOf(currentDifficulty));
        const bDistance = Math.abs(bDiffOrder - difficultyOrder.indexOf(currentDifficulty));
        return aDistance - bDistance;
      }
      
      return aDiffOrder - bDiffOrder;
    });

    // Return top 5 suggestions
    return matchingExercises.slice(0, 5).map(ex => ({
      ...ex,
      suggestionReason: this.getSuggestionReason(originalExercise, ex, currentDifficulty)
    }));
  }

  /**
   * Get the reason why an exercise is suggested
   * @param {object} originalExercise - Original exercise
   * @param {object} suggestion - Suggested exercise
   * @param {string} currentDifficulty - Current difficulty level
   * @returns {string} Reason text
   */
  getSuggestionReason(originalExercise, suggestion, currentDifficulty) {
    const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
    const originalDiffIndex = difficultyOrder.indexOf(originalExercise.difficulty);
    const suggestionDiffIndex = difficultyOrder.indexOf(suggestion.difficulty);
    const diffDifference = suggestionDiffIndex - originalDiffIndex;

    let reason = '';
    
    if (diffDifference === 0) {
      reason = 'Same difficulty level';
    } else if (diffDifference === 1) {
      reason = 'Slightly easier alternative';
    } else if (diffDifference === -1) {
      reason = 'Slightly harder alternative';
    } else if (diffDifference > 1) {
      reason = 'Much easier alternative';
    } else {
      reason = 'Much harder alternative';
    }

    // Add muscle group info
    const sharedMuscles = (suggestion.muscles || []).filter(m => 
      (originalExercise.muscles || []).includes(m) || 
      (originalExercise.muscles_secondary || []).includes(m)
    );

    if (sharedMuscles.length > 0) {
      reason += ` - targets ${sharedMuscles.length} same muscle group(s)`;
    }

    return reason;
  }

  /**
   * Filter suggestions by difficulty preference
   * @param {Array} suggestions - Array of suggested exercises
   * @param {string} difficultyPreference - 'easier', 'same', 'harder'
   * @returns {Array} Filtered suggestions
   */
  filterByDifficulty(suggestions, difficultyPreference) {
    const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
    
    return suggestions.filter(ex => {
      if (difficultyPreference === 'same') {
        return ex.difficulty === 'same'; // This would need to be passed in
      } else if (difficultyPreference === 'easier') {
        return difficultyOrder.indexOf(ex.difficulty) <= difficultyOrder.indexOf('intermediate');
      } else if (difficultyPreference === 'harder') {
        return difficultyOrder.indexOf(ex.difficulty) >= difficultyOrder.indexOf('intermediate');
      }
      return true;
    });
  }
}

// Export singleton instance
export const exerciseSuggestionService = new ExerciseSuggestionService();
