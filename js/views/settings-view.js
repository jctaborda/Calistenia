/**
 * SettingsView - Displays and manages app settings
 */

import { getState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { show } from '../services/toast-service.js';

export function renderSettingsView() {
  const main = document.getElementById('app');
  const state = getState();
  const { settings } = state;

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div class="flex-between mb-1rem">
        <h1>${t('settings.title') || 'Settings'}</h1>
        <button class="btn btn-secondary btn-sm" data-nav="#home">${t('common.back')}</button>
      </div>

      <!-- Units Section -->
      <div class="settings-section">
        <h3>${t('settings.units') || 'Units'}</h3>
        <div class="setting-item">
          <label for="units-select">${t('settings.unit_system') || 'Unit System'}</label>
          <select id="units-select" class="setting-select">
            <option value="metric" ${settings.units === 'metric' ? 'selected' : ''}>Metric (kg, cm)</option>
            <option value="imperial" ${settings.units === 'imperial' ? 'selected' : ''}>Imperial (lbs, inches)</option>
          </select>
        </div>
      </div>

      <!-- Notifications Section -->
      <div class="settings-section">
        <h3>${t('settings.notifications') || 'Notifications'}</h3>
        <div class="setting-item">
          <label for="notifications-toggle">
            <span>${t('settings.enable_notifications') || 'Enable Notifications'}</span>
            <input type="checkbox" id="notifications-toggle" class="setting-toggle" ${settings.notifications?.enabled ? 'checked' : ''}>
          </label>
        </div>
        <div class="setting-item">
          <label for="workout-reminders-toggle">
            <span>${t('settings.workout_reminders') || 'Workout Reminders'}</span>
            <input type="checkbox" id="workout-reminders-toggle" class="setting-toggle" ${settings.notifications?.workoutReminders ? 'checked' : ''}>
          </label>
        </div>
        <div class="setting-item">
          <label for="achievements-toggle">
            <span>${t('settings.achievement_notifications') || 'Achievement Notifications'}</span>
            <input type="checkbox" id="achievements-toggle" class="setting-toggle" ${settings.notifications?.achievements ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <!-- Appearance Section -->
      <div class="settings-section">
        <h3>${t('settings.appearance') || 'Appearance'}</h3>
        <div class="setting-item">
          <label for="theme-select">${t('settings.theme') || 'Theme'}</label>
          <select id="theme-select" class="setting-select">
            <option value="light" ${settings.appearance?.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${settings.appearance?.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="system" ${settings.appearance?.theme === 'system' ? 'selected' : ''}>System Default</option>
          </select>
        </div>
        <div class="setting-item">
          <label for="font-size-select">${t('settings.font_size') || 'Font Size'}</label>
          <select id="font-size-select" class="setting-select">
            <option value="small" ${settings.appearance?.fontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="medium" ${settings.appearance?.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="large" ${settings.appearance?.fontSize === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </div>
      </div>

      <!-- Voice Cues Section -->
      <div class="settings-section">
        <h3>${t('settings.voice_cues') || 'Voice Cues'}</h3>
        <div class="setting-item">
          <label for="voice-cues-toggle">
            <span>${t('settings.enable_voice_cues') || 'Enable Voice Cues'}</span>
            <input type="checkbox" id="voice-cues-toggle" class="setting-toggle" ${settings.voiceCues?.enabled ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <!-- Data Management Section -->
      <div class="settings-section">
        <h3>${t('settings.data_management') || 'Data Management'}</h3>
        <p class="detail-text">${t('profile.data_management_desc') || 'Backup & Restore: Export your workout history and routines, or restore from a backup file.'}</p>
        <div class="setting-item">
          <a href="#export-import" class="btn btn-secondary full-width">${t('profile.export_import') || 'Export / Import Data'}</a>
        </div>
      </div>

      <!-- About Section -->
      <div class="settings-section">
        <h3>${t('settings.about') || 'About'}</h3>
        <div class="setting-item">
          <p class="detail-text">
            ${t('settings.app_version') || 'Version'}: 1.0.0
          </p>
          <p class="detail-text">
            ${t('settings.app_description') || 'Calisthenics Mastery - Your personal trainer for bodyweight exercises'}
          </p>
        </div>
      </div>
    </div>
  `;

  // Wire up event handlers
  const unitsSelect = main.querySelector('#units-select');
  if (unitsSelect) {
    unitsSelect.addEventListener('change', (e) => {
      const state = getState();
      updateState({
        settings: {
          ...state.settings,
          units: e.target.value
        }
      });
      show(t('settings.units_updated') || 'Units updated', 'success');
    });
  }

  const themeSelect = main.querySelector('#theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const state = getState();
      updateState({
        settings: {
          ...state.settings,
          appearance: {
            ...state.settings.appearance,
            theme: e.target.value
          }
        }
      });
      
      // Apply theme immediately
      applyTheme(e.target.value);
      show(t('settings.theme_updated') || 'Theme updated', 'success');
    });
  }

  // Toggle switches
  const toggles = main.querySelectorAll('.setting-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => handleSettingToggle(e, state));
  });

}

/**
 * Handle toggle switch changes
 */
function handleSettingToggle(e, state) {
  const toggle = e.target;
  const settingPath = toggle.id.replace('-toggle', '');
  
  let updates = {};
  
  if (settingPath === 'notifications') {
    updates = {
      settings: {
        ...state.settings,
        notifications: {
          ...state.settings.notifications,
          enabled: toggle.checked
        }
      }
    };
  } else if (settingPath === 'workout-reminders') {
    updates = {
      settings: {
        ...state.settings,
        notifications: {
          ...state.settings.notifications,
          workoutReminders: toggle.checked
        }
      }
    };
  } else if (settingPath === 'achievements') {
    updates = {
      settings: {
        ...state.settings,
        notifications: {
          ...state.settings.notifications,
          achievements: toggle.checked
        }
      }
    };
  } else if (settingPath === 'voice-cues') {
    updates = {
      settings: {
        ...state.settings,
        voiceCues: {
          ...state.settings.voiceCues,
          enabled: toggle.checked
        }
      }
    };
  }
  
  if (Object.keys(updates).length > 0) {
    updateState(updates);
    const settingName = toggle.parentElement.querySelector('span')?.textContent || settingPath;
    show(`${settingName}: ${toggle.checked ? 'On' : 'Off'}`, 'success');
  }
}

/**
 * Apply theme to the app
 */
function applyTheme(theme) {
  if (theme === 'system') {
    // Use system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  // Save to localStorage for immediate access
  localStorage.setItem('theme', theme);
}

// Export for router usage
export default { render: renderSettingsView };
