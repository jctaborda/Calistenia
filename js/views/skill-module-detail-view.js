import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';

export async function renderSkillModuleDetailView(moduleId) {
  const main = document.getElementById('app');
  const state = await getState();
  
  // Load exercises data and transform into modules (same as skill-modules-view.js)
  let modules;
  try {
    const response = await fetch('./data/exercises.json');
    if (!response.ok) throw new Error('Failed to load exercises');
    const exercisesArray = await response.json();
    
    // Transform exercises array into modules format
    // Group by skill category (similar to old "skill" field in exercises.json)
    const skillGroups = {};
    exercisesArray.forEach(ex => {
      const skillName = ex.skill || 'General';
      if (!skillGroups[skillName]) {
        skillGroups[skillName] = {
          id: skillName.toLowerCase().replace(/\s+/g, '-'),
          name: skillName,
          description: `Master the ${skillName} progression from beginner to advanced`,
          difficulty: 'mixed',
          exercises: []
        };
      }
      skillGroups[skillName].exercises.push(ex.id);
    });
    
    // Convert to array and sort by name
    modules = Object.values(skillGroups).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    main.innerHTML = renderHeader() + `
      <div class="card">
        <h1>Skill Modules</h1>
        <p class="error-message">Unable to load exercises. Please try again later.</p>
      </div>
    `;
    return;
  }

  const module = modules.find(m => m.id === moduleId);
  if (!module) {
    window.location.hash = '#skill-modules';
    return;
  }

  const exercises = state.exercises || [];
  const history = state.history || [];
  const muscles = state.muscles || [];
  const categories = state.categories || [];

  // Calculate progress for this module
  function isExerciseCompleted(exerciseId) {
    for (const workout of history) {
      if (workout.exercises) {
        for (const ex of workout.exercises) {
          if (ex.exerciseId === exerciseId && ex.actualReps && ex.actualReps.some(r => r > 0)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function getExerciseName(id) {
    const exercise = exercises.find(e => e.id === id);
    return exercise ? exercise.name : 'Unknown Exercise';
  }

  function getExerciseDescription(id) {
    const exercise = exercises.find(e => e.id === id);
    return exercise ? exercise.description : '';
  }

  function getExerciseData(id) {
    const exercise = exercises.find(e => e.id === id);
    return exercise || null;
  }

  const completedCount = module.exercises.filter(id => isExerciseCompleted(id)).length;
  const progress = Math.round((completedCount / module.exercises.length) * 100);

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" onclick="window.location.hash = '#skill-modules'">← Back to Modules</button>
        <span style="font-size: 1.5rem; font-weight: bold;">${progress}%</span>
      </div>
      
      <h1>${module.name}</h1>
      <p>${module.description}</p>
      <p><strong>Difficulty:</strong> ${module.difficulty}</p>
      <p><strong>Total Exercises:</strong> ${module.exercises.length}</p>
      
      <div style="margin: 2rem 0;">
        <h3>Progression Path</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          Complete these exercises in order to master ${module.name}
        </p>
        
        <div class="list-container">
          ${module.exercises.map((exerciseId, index) => {
            const isCompleted = isExerciseCompleted(exerciseId);
            const exerciseName = getExerciseName(exerciseId);
            const description = getExerciseDescription(exerciseId);
            const exerciseData = getExerciseData(exerciseId);
            
            return `
              <div class="workout-card" style="cursor: pointer; border-left: ${isCompleted ? '4px solid #4CAF50' : '4px solid var(--gray-400)'};" onclick="window.location.hash = '#exercise/${exerciseId}'">
                <div class="flex-container">
                  <div class="flex-1">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <strong style="font-size: 1.25rem;">${index + 1}. ${exerciseName}</strong>
                      ${isCompleted ? '<span style="color: #4CAF50; font-weight: bold;">✓ Completed</span>' : ''}
                    </div>
                    <p style="margin-bottom: 0.5rem;">${description}</p>
                    
                    ${exerciseData ? `
                      <div style="display: flex; gap: 1rem; margin-top: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">
                        ${exerciseData.equipment ? `<span>Equipment: ${exerciseData.equipment}</span>` : ''}
                        <span>Difficulty: ${exerciseData.difficulty || 'N/A'}</span>
                      </div>
                    ` : ''}
                  </div>
                  <div class="flex-1" style="text-align: right;">
                    <a href="#exercise/${exerciseId}" style="color: #2196F3; font-weight: bold;">View Details →</a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      ${progress === 100 ? `
        <div class="card" style="background: #C8E6C9;">
          <h3>🎉 Congratulations!</h3>
          <p>You've completed all exercises in the ${module.name} progression. Great work on your dedication and progress!</p>
        </div>
      ` : ''}
      
      <button class="btn" onclick="window.location.hash = '#skill-modules'" style="margin-top: 2rem;">Back to Modules</button>
    </div>
  `;
}

// Export for router usage
window.renderSkillModuleDetailView = renderSkillModuleDetailView;
