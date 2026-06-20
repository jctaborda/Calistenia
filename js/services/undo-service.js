// Undo Service - Handles temporary storage of deleted items and restore functionality
import { saveDeletedItem, getDeletedItemsByType, deleteDeletedItem, clearExpiredDeletedItems } from './database.js';
import { loadExercises, saveExercises } from './storage.js';
import { modulesLoad, routinesLoad, storeExercises, storeModules, storeRoutines } from './database.js';
import { saveModules } from './modules-service.js';
import { show } from './toast-service.js';
import { UNDO_RETENTION_MS, UNDO_CLEANUP_INTERVAL_MS, UNDO_TOAST_DURATION_MS, CLEANUP_INITIAL_DELAY_MS } from '../constants.js';
let undoToasts = new Map(); // Track active undo toast notifications
/**
* Save a deleted item for potential undo
* @param {string} type - Type of item (exercise, module, routine)
* @param {Object} item - The full item data that was deleted
* @param {string|number} originalId - The original ID of the deleted item
*/
export async function saveForUndo(type, item, originalId) {
try {
await saveDeletedItem(type, item, originalId);
    // Show undo toast notification
showUndoToast(type, originalId);
    // Clean up expired items periodically (every hour)
cleanupExpiredItems();
} catch (error) {
console.error('Failed to save item for undo:', error);
}
}
/**
* Show a toast notification with undo option
* @param {string} type - Type of deleted item
* @param {string|number} originalId - Original ID of the item
*/
function showUndoToast(type, originalId) {
// Remove any existing toast for this type
if (undoToasts.has(type)) {
dismissUndoToast(type);
}
  const actionLabels = {
exercise: 'Exercise',
module: 'Module',
routine: 'Routine'
};
  const label = actionLabels[type] || 'Item';
  // Create toast element
const toast = document.createElement('div');
toast.className = 'undo-toast';
toast.innerHTML = `
<span class="undo-toast__message">
${label} deleted. 
<button type="button" class="undo-toast__undo-btn" data-type="${type}" data-id="${originalId}">Undo</button>
</span>
`;
  document.body.appendChild(toast);
  // Handle undo button click
const undoBtn = toast.querySelector('.undo-toast__undo-btn');
undoBtn.addEventListener('click', async () => {
await restoreItem(type, originalId);
dismissUndoToast(type);
});
  // Auto-dismiss after duration
const timeoutId = setTimeout(() => {
if (toast.parentNode) {
toast.remove();
}
undoToasts.delete(type);
}, UNDO_TOAST_DURATION_MS);
  undoToasts.set(type, { toast, timeoutId });
}
/**
* Dismiss and clean up a specific undo toast
* @param {string} type - Type of item to dismiss
*/
export function dismissUndoToast(type) {
if (undoToasts.has(type)) {
const { toast, timeoutId } = undoToasts.get(type);
clearTimeout(timeoutId);
if (toast.parentNode) {
toast.remove();
}
undoToasts.delete(type);
}
}
/**
* Dismiss all active undo toasts
*/
export function dismissAllUndoToasts() {
Array.from(undoToasts.keys()).forEach(type => {
dismissUndoToast(type);
});
}
/**
* Restore a deleted item
* @param {string} type - Type of item to restore
* @param {string|number} originalId - Original ID of the item
*/
export async function restoreItem(type, originalId) {
try {
const deletedItems = await getDeletedItemsByType(type);
const deletedItem = deletedItems.find(d => d.originalId === String(originalId) || d.originalId === Number(originalId));
    if (!deletedItem) {
console.warn('No deleted item found for restore:', originalId, type);
return false;
}
    // Restore based on type
let success = false;
    switch (type) {
     case 'exercise':
       // Exercises are stored as an array, so we need to add it back
       const exercises = await exercisesLoad();
       if (!exercises.find(e => e.id === deletedItem.originalId)) {
         exercises.push(deletedItem.item);
         await saveExercises(exercises);
       }
       success = true;
       break;

     case 'module':
       const modules = await modulesLoad();
       if (!modules.find(m => m.id === deletedItem.originalId)) {
         modules.push(deletedItem.item);
         await saveModules(modules);
       }
       success = true;
       break;

     case 'routine':
       const routines = await routinesLoad();
       if (!routines.find(r => r.id === deletedItem.originalId)) {
         routines.push(deletedItem.item);
         await storeRoutines(routines);
       }
       success = true;
       break;
  case 'body-metric':
// Body metrics are part of user state stored in localStorage
// Full implementation would require storing bodyMetrics in IndexedDB
show('Body metric deleted (30-day undo available for exercises/modules/routines only)', 'info');
// In a full implementation, you'd need to restore from deletedItem.item back to user.bodyMetrics
success = true;
break;
  default:
console.warn('Unknown item type for restore:', type);
}
    if (success) {
// Delete from deleted items store
await deleteDeletedItem(deletedItem.id);
  return true;
} else {
show('Restore failed - item may already exist', 'error');
return false;
}
} catch (error) {
console.error('Failed to restore item:', error);
show('Failed to restore item', 'error');
return false;
}
}
/**
* Clean up expired deleted items
*/
async function cleanupExpiredItems() {
try {
const result = await clearExpiredDeletedItems(UNDO_RETENTION_MS);
if (result.deletedCount > 0) {
}
    // Schedule next cleanup in 1 hour
setTimeout(cleanupExpiredItems, UNDO_CLEANUP_INTERVAL_MS);
} catch (error) {
console.error('Error cleaning up expired items:', error);
}
}
/**
* Initialize the undo service - starts periodic cleanup
*/
export function initUndoService() {
// Start initial cleanup
setTimeout(cleanupExpiredItems, CLEANUP_INITIAL_DELAY_MS); // First cleanup after 5 seconds
  // Log current count
getDeletedItemsByType('exercise').then(items => {
});
}
