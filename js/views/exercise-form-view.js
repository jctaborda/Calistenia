// Exercise Form View - Single form for add/edit exercise
// No tabs, no search list — just a clean form like the routine builder

import { ErrorBoundaryService } from '../services/error-boundary-service.js';
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';

export async function renderExerciseForm(editId) {
  const app = document.getElementById('app');
  
  // Check sessionStorage for edit ID first (from click handler), then URL params or hash
  const editIdFromSession = sessionStorage.getItem('editingExerciseId');
  const urlParams = new URLSearchParams(window.location.search);
  const editIdParam = urlParams.get('edit');
  
  // Also check if hash contains edit parameter like #exercise-form?edit=5
  let actualEditId;
  if (editId) {
    actualEditId = editId;
  } else if (editIdFromSession) {
    actualEditId = editIdFromSession;
  } else if (editIdParam) {
    actualEditId = editIdParam;
  } else {
    // Check hash for ?edit= parameter
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const searchParams = new URLSearchParams(hashParts[1]);
      actualEditId = searchParams.get('edit');
    }
  }
  
  const isEditing = !!actualEditId;
  
  app.innerHTML = renderHeader() + `
    <link href="./css/style.css" rel="stylesheet">
    <div class="card">
      ${getFormHTML(isEditing, actualEditId)}
    </div>`;
  
  // Initialize the form service
  (async () => {
    setTimeout(async () => {
      const { initExerciseForm } = await import('../services/exercise-form-service.js');
      await initExerciseForm(actualEditId, updateState);
    }, 50);
  })();
}

function getFormHTML(isEditing, editId) {
  const title = isEditing ? t('common.edit') + ' ' + t('exercises.add').toLowerCase() : t('exercises.add');
  const submitLabel = isEditing ? t('common.save') : t('exercises.add');
  
  return `
    <div class="exercise-form-container">
      <div id="message" class="message"></div>

      <h2>${title}</h2>

      <!-- Add/Edit Exercise Form -->
      <form id="exerciseForm">
        ${isEditing ? '<input type="hidden" id="editId" name="id" value="' + (editId || '') + '">' : ''}

        <div class="form-group">
          <label for="name">${t('exercise.details.title')}</label>
          <input type="text" id="name" name="name" required minlength="2" maxlength="100" placeholder="e.g., Push-Up">
        </div>

        <div class="form-group">
          <label for="description">${t('exercise.details.description')}</label>
          <textarea id="description" name="description" required maxlength="2000" placeholder="Describe the exercise..."></textarea>
        </div>

        <div class="form-group">
          <label for="skill">${t('builder.category')}</label>
          <input type="text" id="skill" name="skill" required minlength="2" maxlength="100" placeholder="e.g., Push-Up Variations">
        </div>

        <div class="form-group">
          <label for="equipment">${t('exercise.details.equipment')}</label>
          <div class="checkbox-group" id="equipment-container"></div>
        </div>

        <div class="form-group">
          <label for="difficulty">${t('builder.difficulty')}</label>
          <select id="difficulty" name="difficulty">
            <option value="">Select Difficulty...</option>
          </select>
        </div>

        <div class="form-group">
          <label for="image_url">Image URL (optional)</label>
          <input type="text" id="image_url" name="image_url" placeholder="assets/images/exercises/... or https://..." maxlength="500" title="Enter image path or URL">
        </div>

        <div class="form-group">
          <label for="video_url">Video URL (optional)</label>
          <input type="text" id="video_url" name="video_url" placeholder="assets/videos/exercises/... or https://..." maxlength="500" title="Enter video path or URL">
        </div>

        <div class="form-group">
          <label for="categories">${t('exercise.details.category')}</label>
          <div class="checkbox-group" id="categories-container"></div>
        </div>

        <div class="form-group">
          <label for="muscles">${t('exercise.details.muscles')}</label>
          <div class="checkbox-group" id="muscles-container"></div>
        </div>

        <div class="form-group">
          <label for="muscles_secondary">${t('exercise.details.secondary_muscles')}</label>
          <div class="checkbox-group" id="muscles-secondary-container"></div>
        </div>

        <!-- Prerequisites: Select exercises that must be mastered before this one -->
        <div class="form-group">
          <label for="prerequisites">${t('exercise.details.prerequisites')}</label>
          <select id="prerequisites" multiple size="6" class="w-100">
            <option value="">-- Select Prerequisites --</option>
          </select>
          <small class="form-hint">Hold Ctrl/Cmd to select multiple exercises that are prerequisites for this exercise.</small>
        </div>

        <!-- Progressions: Exercises that can be done after mastering this one -->
        <div class="form-group">
          <label for="progressions">${t('exercise.details.progressions')}</label>
          <select id="progressions" multiple size="6" class="w-100">
            <option value="">-- Select Progressions --</option>
          </select>
          <small class="form-hint">Hold Ctrl/Cmd to select multiple exercises that are progressions from this one.</small>
        </div>

        <!-- Form Cues: Dynamic list of technique cues -->
        <div class="form-group">
          <label for="formCues">${t('exercise.details.form_cues')}</label>
          <div id="formCuesContainer" class="mb-05rem">
            <div class="dynamic-list-item" id="formCue-1">
              <input type="text" class="dynamic-list-input" placeholder="e.g., Keep your core tight">
              <button type="button" class="btn btn-danger btn-sm remove-item" title="Remove">✕</button>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="addFormCueBtn">+ ${t('common.add')}</button>
        </div>

        <!-- Common Mistakes: Dynamic list of mistakes to avoid -->
        <div class="form-group">
          <label for="commonMistakes">${t('exercise.details.common_mistakes')}</label>
          <div id="commonMistakesContainer" class="mb-05rem">
            <div class="dynamic-list-item" id="mistake-1">
              <input type="text" class="dynamic-list-input" placeholder="e.g., Don't let hips sag">
              <button type="button" class="btn btn-danger btn-sm remove-item" title="Remove">✕</button>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="addMistakeBtn">+ ${t('common.add')}</button>
        </div>

        <div class="button-group">
          <button type="submit" class="btn btn-primary">${submitLabel}</button>
          <button type="reset" class="btn btn-secondary">${t('common.clear')}</button>
          ${isEditing ? '<button type="button" class="btn btn-danger" id="deleteBtn">' + t('exercises.delete') + '</button>' : ''}
          ${isEditing ? '<button type="button" class="btn btn-secondary" id="cancelEditBtn">' + t('common.cancel') + '</button>' : ''}
        </div>
      </form>
    </div>`;
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderExerciseForm };
