// Export/Import View - Backup and restore user data
import { 
  downloadExport, 
  importFromFile, 
  getExportMetadata,
  clearUserData 
} from '../services/export-import.js';
import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';

export function renderExportImportView() {
  const state = getState();
  const hasWorkouts = (state.workouts?.length || 0) > 0;
  const hasPrograms = (state.routines?.length || 0) > 0;

  return `
    <div class="view-container">
      ${renderHeader('Export & Import')}
      
      <div class="content-section">
        <section class="card export-section">
          <h3>📤 Export Data</h3>
          <p class="description">Download a backup of your workout history and custom routines as a JSON file.</p>
          
          ${hasWorkouts || hasPrograms 
            ? `
            <button id="btn-download-export" class="btn btn-primary btn-large">
              <span class="icon">⬇️</span> Download Backup
            </button>
            ` 
            : `
            <div class="empty-state">
              <p class="empty-icon">📦</p>
              <p>No data to export yet. Complete some workouts first!</p>
            </div>
            `
          }
          
          <div id="export-info" class="info-box" style="display: none;">
            <p><strong>Backup created:</strong> <span id="export-timestamp"></span></p>
            <p><strong>Includes:</strong> <span id="export-counts"></span></p>
            <p class="small"><em>This file can be used to restore your data on another device.</em></p>
          </div>
        </section>

        <section class="card import-section">
          <h3>📥 Import Data</h3>
          <p class="description">Restore your workout history and custom routines from a backup file.</p>
          
          <label for="import-file" class="file-input-label">
            <input type="file" id="import-file" accept=".json,application/json" hidden />
            <span class="btn btn-secondary btn-large">📁 Select Backup File</span>
          </label>
          
          <div id="import-status" class="status-box" style="display: none;"></div>
          
          <div class="warning-box">
            <strong>⚠️ Note:</strong> Imported data will be merged with existing data. 
            Duplicate workouts (same ID) will be skipped.
          </div>
        </section>

        ${hasWorkouts || hasPrograms ? `
        <section class="card danger-section">
          <h3>🗑️ Clear User Data</h3>
          <p class="description">Permanently delete all your workouts, custom routines, and skill modules from this device.</p>
          
          <button id="btn-clear-data" class="btn btn-danger btn-large">
            <span class="icon">🗑️</span> Clear All My Data
          </button>
          
          <div id="clear-status" class="status-box" style="display: none;"></div>
        </section>
        ` : ''}
      </div>
    </div>
  `;
}

export async function render() {
  const viewContainer = document.getElementById('app');
  viewContainer.innerHTML = renderExportImportView();

  // Setup event listeners
  setupEventListeners();
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render };

function setupEventListeners() {
  // Download export button
  const downloadBtn = document.getElementById('btn-download-export');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownloadExport);
  }

  // Import file input
  const importInput = document.getElementById('import-file');
  if (importInput) {
    importInput.addEventListener('change', handleImportFile);
  }

  // Clear data button
  const clearBtn = document.getElementById('btn-clear-data');
  if (clearBtn) {
    clearBtn.addEventListener('click', handleClearData);
  }
}

async function handleDownloadExport() {
  const exportInfo = document.getElementById('export-info');
  const downloadBtn = document.getElementById('btn-download-export');
  
  try {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span class="spinner"></span> Generating...';
    
    const metadata = await getExportMetadata();
    
    // Download the file
    const filename = `calisthenics-backup-${new Date().toISOString().split('T')[0]}.json`;
    await downloadExport(filename);
    
    // Show success info
    exportInfo.style.display = 'block';
    document.getElementById('export-timestamp').textContent = new Date(metadata.exportedAt).toLocaleString();
    document.getElementById('export-counts').textContent = 
      `${metadata.workoutCount} workouts, ${metadata.routineCount} routines, ${metadata.moduleCount} modules`;
    
    downloadBtn.innerHTML = '<span class="icon">✓</span> Backup Downloaded';
    
    setTimeout(() => {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<span class="icon">⬇️</span> Download Another Backup';
    }, 2000);
    
  } catch (error) {
    alert('Error: ' + error.message);
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span class="icon">⬇️</span> Download Backup';
  }
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const importStatus = document.getElementById('import-status');
  const importBtn = event.target.parentElement.querySelector('.btn');

  try {
    importBtn.disabled = true;
    importBtn.innerHTML = '<span class="spinner"></span> Importing...';
    
    const result = await importFromFile(file);
    
    if (result.success) {
      const stats = result.stats;
      
      importStatus.style.display = 'block';
      importStatus.className = 'status-box success';
      importStatus.innerHTML = `
        <p><strong>✅ Import Complete!</strong></p>
        <ul>
          ${stats.workouts.imported > 0 ? `<li>Workouts: ${stats.workouts.imported} imported, ${stats.workouts.skipped} skipped</li>` : ''}
          ${stats.routines.imported > 0 ? `<li>Routines: ${stats.routines.imported} imported, ${stats.routines.skipped} skipped</li>` : ''}
          ${stats.skillModules.imported > 0 ? `<li>Skill Modules: ${stats.skillModules.imported} imported, ${stats.skillModules.skipped} skipped</li>` : ''}
        </ul>
        ${result.stats.errors.length > 0 
          ? `<p class="error"><strong>Errors:</strong><br/>${result.stats.errors.join('<br/>')}</p>` 
          : ''}
      `;
      
      // Reload the view to show updated data
      setTimeout(() => {
        window.location.hash = '#home';
      }, 3000);
    } else {
      // Handle validation errors with detailed messages
      importStatus.style.display = 'block';
      importStatus.className = 'status-box error';
      
      let errorHtml = `<p><strong>❌ Import Failed:</strong></p>`;
      
      if (result.error) {
        errorHtml += `<p>${result.error}</p>`;
      }
      
      if (result.validationErrors && result.validationErrors.length > 0) {
        errorHtml += `
          <div class="validation-errors">
            <p><strong>Validation Errors:</strong></p>
            <ul>
              ${result.validationErrors.map(err => `<li>${err}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      importStatus.innerHTML = errorHtml;
    }
    
  } catch (error) {
    importStatus.style.display = 'block';
    importStatus.className = 'status-box error';
    importStatus.innerHTML = `<p><strong>❌ Import Failed:</strong> ${error.message}</p>`;
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = '📁 Select Backup File';
    event.target.value = ''; // Reset file input
  }
}

async function handleClearData() {
  const clearStatus = document.getElementById('clear-status');
  const clearBtn = document.getElementById('btn-clear-data');
  
  if (!confirm('Are you sure you want to delete ALL your workout history, custom routines, and skill modules? This cannot be undone.')) {
    return;
  }

  try {
    clearBtn.disabled = true;
    clearBtn.innerHTML = '<span class="spinner"></span> Clearing...';
    
    const result = await clearUserData();
    
    clearStatus.style.display = 'block';
    clearStatus.className = 'status-box success';
    clearStatus.innerHTML = `
      <p><strong>✅ Data Cleared!</strong></p>
      <ul>
        <li>${result.deleted.workouts} workouts deleted</li>
        <li>${result.deleted.routines} routines deleted</li>
        <li>${result.deleted.modules} skill modules deleted</li>
      </ul>
    `;
    
    setTimeout(() => {
      window.location.hash = '#home';
    }, 2000);
    
  } catch (error) {
    clearStatus.style.display = 'block';
    clearStatus.className = 'status-box error';
    clearStatus.innerHTML = `<p><strong>❌ Error:</strong> ${error.message}</p>`;
  } finally {
    clearBtn.disabled = false;
    clearBtn.innerHTML = '<span class="icon">🗑️</span> Clear All My Data';
  }
}
