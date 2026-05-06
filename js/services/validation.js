/**
 * ValidationService - Provides comprehensive form validation utilities
 * Centralized validation logic for all forms in the application
 */

export class ValidationService {
  /**
   * Validate exercise name (required, non-empty)
   * @param {string} value - Exercise name to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateExerciseName(value) {
    if (!value || value.trim().length === 0) {
      return { valid: false, error: 'Exercise name is required' };
    }
    
    if (value.trim().length < 2) {
      return { valid: false, error: 'Exercise name must be at least 2 characters' };
    }
    
    if (value.length > 100) {
      return { valid: false, error: 'Exercise name must not exceed 100 characters' };
    }
    
    // Prevent HTML injection
    if (/<script|javascript:/i.test(value)) {
      return { valid: false, error: 'Invalid characters detected' };
    }
    
    return { valid: true, error: null };
  }

  /**
   * Validate exercise description
   * @param {string} value - Description to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateDescription(value) {
    if (!value || value.trim().length === 0) {
      return { valid: true, error: null }; // Optional field
    }
    
    if (value.length > 2000) {
      return { valid: false, error: 'Description must not exceed 2000 characters' };
    }
    
    // Prevent HTML injection
    if (/<script|javascript:/i.test(value)) {
      return { valid: false, error: 'Invalid characters detected' };
    }
    
    return { valid: true, error: null };
  }

  /**
   * Validate form fields collectively
   * @param {FormData} formData - Form data object
   * @returns {{valid: boolean, errors: object}}
   */
  static validateExerciseForm(formData) {
    const errors = {};
    let hasErrors = false;

    // Required fields
    const nameValidation = this.validateExerciseName(formData.get('name'));
    if (!nameValidation.valid) {
      errors.name = nameValidation.error;
      hasErrors = true;
    }

    const descriptionValidation = this.validateDescription(formData.get('description'));
    if (!descriptionValidation.valid) {
      errors.description = descriptionValidation.error;
      hasErrors = true;
    }

    // Required fields
    if (!formData.get('skill') || formData.get('skill').trim() === '') {
      errors.skill = 'Skill category is required';
      hasErrors = true;
    }

    // Validate URL fields (optional but must be valid URLs)
    const image_url = formData.get('image_url');
    if (image_url && image_url.length > 0) {
      try {
        new URL(image_url);
      } catch (_) {
        errors.image_url = 'Please enter a valid URL';
        hasErrors = true;
      }
    }

    const video_url = formData.get('video_url');
    if (video_url && video_url.length > 0) {
      try {
        new URL(video_url);
      } catch (_) {
        errors.video_url = 'Please enter a valid URL';
        hasErrors = true;
      }
    }

    return {
      valid: !hasErrors,
      errors
    };
  }

  /**
   * Validate numeric inputs in forms
   * @param {string} value - Numeric string to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateNumber(value) {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, error: null }; // Empty is OK (handled elsewhere)
    }

    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { valid: false, error: 'Must be a valid number' };
    }

    if (num < 0) {
      return { valid: false, error: 'Cannot be negative' };
    }

    if (num > 10000) {
      return { valid: false, error: 'Value too large' };
    }

    return { valid: true, error: null };
  }

  /**
   * Validate HTML form element
   * @param {HTMLInputElement|HTMLSelectElement} element - Form element to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateFormField(element) {
    if (element.hasAttribute('required')) {
      const value = element.value.trim();
      if (!value) {
        return { valid: false, error: 'This field is required' };
      }
    }

    // Check HTML5 validation constraints
    if (element.type === 'number') {
      if (element.min !== undefined && parseFloat(element.value) < element.min) {
        return { valid: false, error: `Minimum value is ${element.min}` };
      }
      if (element.max !== undefined && parseFloat(element.value) > element.max) {
        return { valid: false, error: `Maximum value is ${element.max}` };
      }
    }

    if (element.minLength && element.value.length < element.minLength) {
      return { valid: false, error: `Minimum length is ${element.minLength}` };
    }

    if (element.maxLength && element.value.length > element.maxLength) {
      return { valid: false, error: `Maximum length is ${element.maxLength}` };
    }

    return { valid: true, error: null };
  }

  /**
   * Show validation error message in UI
   * @param {string} fieldName - Name of field with error
   * @param {string} message - Error message to display
   */
  static showError(fieldName, message) {
    const input = document.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.classList.add('error');
      
      // Remove existing error message
      const existingError = input.parentElement.querySelector('.error-message');
      if (existingError) {
        existingError.remove();
      }
      
      // Add error message element
      const errorMsg = document.createElement('div');
      errorMsg.className = 'error-message';
      errorMsg.textContent = message;
      input.parentElement.appendChild(errorMsg);
    } else {
      // Fallback: show in global message area
      showMessage(message, 'error');
    }
  }

  /**
   * Clear validation errors for a field
   * @param {string} fieldName - Name of field to clear
   */
  static clearError(fieldName) {
    const input = document.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.classList.remove('error');
      const existingError = input.parentElement.querySelector('.error-message');
      if (existingError) {
        existingError.remove();
      }
    }
  }

  /**
   * Clear all validation errors in form
   */
  static clearAllErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(el => el.remove());
    
    const inputs = document.querySelectorAll('input.error, select.error, textarea.error');
    inputs.forEach(el => el.classList.remove('error'));
  }
}

// Helper function to show messages in form containers
function showMessage(text, type) {
  // Try to find message container in form sections
  const messageEls = document.querySelectorAll('#message');
  if (messageEls.length > 0) {
    const msgEl = messageEls[0];
    msgEl.textContent = text;
    msgEl.className = `message ${type}`;
    msgEl.style.display = 'block';
    
    setTimeout(() => {
      msgEl.style.display = 'none';
    }, 5000);
  } else {
    // Fallback: alert (shouldn't happen in normal usage)
    console.log(`[${type.toUpperCase()}] ${text}`);
  }
}
