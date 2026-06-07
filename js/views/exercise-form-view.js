// Exercise Form View - Component for managing exercise CRUD operations
// Handles prerequisites, progressions, formCues, and commonMistakes

import { ErrorBoundaryService } from '../services/error-boundary-service.js';

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
  
  
  app.innerHTML = renderHeader() + `
    <link href="./css/style.css" rel="stylesheet">
    <div class="card">
      ${getFormHTML()}
    </div>`;
  
  // Initialize the form service
  setTimeout(() => {
    const formDiv = document.querySelector('.exercise-form-container');
    if (formDiv && window.initExerciseForm) {
      window.initExerciseForm(actualEditId, window.updateState);
    }
  }, 50);
}

function renderHeader() {
  return `
    <header class="app-header">
      <div class="header-content">
        <button class="back-btn" aria-label="Go back" data-nav="back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="header-title">Exercise Editor</h1>
        <div style="width: 40px;"></div>
      </div>
    </header>`;
}

function getFormHTML() {
  return `
    <div class="exercise-form-container">
      <div id="message" class="message"></div>

      <div class="form-tabs">
        <button class="tab-btn active" data-tab="add">Add New Exercise</button>
        <button class="tab-btn" data-tab="edit">Edit/Delete Exercise</button>
      </div>

      <!-- Add Exercise Form -->
      <div id="add-form" class="form-section active">
        <form id="exerciseForm">
          <div class="form-group">
            <label for="name">Exercise Name *</label>
            <input type="text" id="name" name="name" required minlength="2" maxlength="100" placeholder="e.g., Push-Up" pattern="[a-zA-Z0-9\s\-,\.\\(\\)]+" title="Minimum 2 characters, maximum 100. Letters, numbers, spaces only.">
          </div>

          <div class="form-group">
            <label for="description">Description *</label>
            <textarea id="description" name="description" required maxlength="2000" placeholder="Describe the exercise..."></textarea>
          </div>

          <div class="form-group">
            <label for="skill">Skill Category *</label>
            <input type="text" id="skill" name="skill" required minlength="2" maxlength="100" placeholder="e.g., Push-Up Variations" pattern="[a-zA-Z0-9\s\-,\.\\(\\)]+">
          </div>

          <div class="form-group">
            <label for="equipment">Equipment (select multiple)</label>
            <div class="checkbox-group" id="equipment-container"></div>
          </div>

          <div class="form-group">
            <label for="difficulty">Difficulty Level</label>
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
            <label for="categories">Categories (select multiple)</label>
            <div class="checkbox-group" id="categories-container"></div>
          </div>

          <div class="form-group">
            <label for="muscles">Primary Muscles (select multiple)</label>
            <div class="checkbox-group" id="muscles-container"></div>
          </div>

          <div class="form-group">
            <label for="muscles_secondary">Secondary Muscles (select multiple)</label>
            <div class="checkbox-group" id="muscles-secondary-container"></div>
          </div>

          <div class="button-group">
            <button type="submit" class="btn btn-primary">Add Exercise</button>
            <button type="reset" class="btn btn-secondary">Clear Form</button>
          </div>
        </form>
      </div>

      <!-- Edit/Delete Exercise Form -->
      <div id="edit-form" class="form-section">
        <div class="search-box">
          <div class="form-group">
            <label for="searchExercise">Search Exercise</label>
            <input type="text" id="searchExercise" placeholder="Type to search...">
          </div>
        </div>

        <div id="exerciseList" class="exercise-list"></div>

        <div id="editContainer" style="display: none;">
          <!-- Edit form with checkboxes and dropdowns properly populated -->
          <h2>Edit Exercise</h2>
          <form id="editForm">
            <input type="hidden" id="editId" name="id">

            <div class="form-group">
              <label for="editName">Exercise Name *</label>
              <input type="text" id="editName" name="name" required minlength="2" maxlength="100" placeholder="e.g., Push-Up" pattern="[a-zA-Z0-9\s\-,\.\\(\\)]+">
            </div>

            <div class="form-group">
              <label for="editDescription">Description *</label>
              <textarea id="editDescription" name="description" required maxlength="2000"></textarea>
            </div>

            <div class="form-group">
              <label for="editSkill">Skill Category *</label>
              <input type="text" id="editSkill" name="skill" required minlength="2" maxlength="100" pattern="[a-zA-Z0-9\s\-,\.\\(\\)]+">
            </div>

            <div class="form-group">
              <label for="editEquipment">Equipment (select multiple)</label>
              <div class="checkbox-group" id="edit-equipment-container"></div>
            </div>

            <div class="form-group">
              <label for="editDifficulty">Difficulty Level</label>
              <select id="editDifficulty" name="difficulty">
                <option value="">Select Difficulty...</option>
              </select>
            </div>

            <div class="form-group">
              <label for="editImage_url">Image URL (optional)</label>
              <input type="text" id="editImage_url" name="image_url" maxlength="500" title="Enter image path or URL">
            </div>

            <div class="form-group">
              <label for="editVideo_url">Video URL (optional)</label>
              <input type="text" id="editVideo_url" name="video_url" maxlength="500" title="Enter video path or URL">
            </div>

            <!-- Prerequisites: Select exercises that must be mastered before this one -->
            <div class="form-group">
              <label for="editPrerequisites">Prerequisites (exercises to master first)</label>
              <select id="editPrerequisites" multiple size="6" style="width: 100%;">
                <option value="">-- Select Prerequisites --</option>
              </select>
              <small class="form-hint">Hold Ctrl/Cmd to select multiple exercises that are prerequisites for this exercise.</small>
            </div>

            <!-- Progressions: Exercises that can be done after mastering this one -->
            <div class="form-group">
              <label for="editProgressions">Progressions (advanced variations)</label>
              <select id="editProgressions" multiple size="6" style="width: 100%;">
                <option value="">-- Select Progressions --</option>
              </select>
              <small class="form-hint">Hold Ctrl/Cmd to select multiple exercises that are progressions from this one.</small>
            </div>

            <!-- Form Cues: Dynamic list of technique cues -->
            <div class="form-group">
              <label for="editFormCues">Form Cues</label>
              <div id="formCuesContainer" style="margin-bottom: 0.5rem;">
                <div class="dynamic-list-item" id="formCue-1">
                  <input type="text" class="dynamic-list-input" placeholder="e.g., Keep your core tight">
                  <button type="button" class="btn btn-danger btn-sm remove-item" title="Remove">✕</button>
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="addFormCueBtn">+ Add Form Cue</button>
            </div>

            <!-- Common Mistakes: Dynamic list of mistakes to avoid -->
            <div class="form-group">
              <label for="editCommonMistakes">Common Mistakes</label>
              <div id="commonMistakesContainer" style="margin-bottom: 0.5rem;">
                <div class="dynamic-list-item" id="mistake-1">
                  <input type="text" class="dynamic-list-input" placeholder="e.g., Don't let hips sag">
                  <button type="button" class="btn btn-danger btn-sm remove-item" title="Remove">✕</button>
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="addMistakeBtn">+ Add Common Mistake</button>
            </div>

            <div class="form-group">
              <label for="editCategories">Categories (select multiple)</label>
              <div class="checkbox-group" id="edit-categories-container"></div>
            </div>

            <div class="form-group">
              <label for="editMuscles">Primary Muscles (select multiple)</label>
              <div class="checkbox-group" id="edit-muscles-container"></div>
            </div>

            <div class="form-group">
              <label for="editMuscles_secondary">Secondary Muscles (select multiple)</label>
              <div class="checkbox-group" id="edit-muscles-secondary-container"></div>
            </div>

            <div class="button-group">
              <button type="submit" class="btn btn-primary">Update Exercise</button>
              <button type="button" class="btn btn-danger" id="deleteBtn">Delete Exercise</button>
              <button type="button" class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
            </div>
          </form>
        </div>

        <div id="loadingExercise" class="loading" style="display: none;">
          Loading exercise details...
        </div>
      </div>
    </div>`;
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderExerciseForm };
