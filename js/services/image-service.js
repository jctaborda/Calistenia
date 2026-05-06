/**
 * ImageService - Handles image loading with fallbacks for muscle diagrams and other images
 * Provides graceful degradation when images are missing or URLs are invalid
 */

export class ImageService {
  /**
   * Create an image element with error handling
   * @param {string} src - Image source URL
   * @param {string} alt - Alt text for accessibility
   * @param {string} fallbackSrc - Fallback image if primary fails (optional)
   * @returns {HTMLImageElement} - Image element with error handler attached
   */
  static createImage(src, alt, fallbackSrc = null) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    
    // Add CSS classes for styling
    img.className = 'muscle-layer';
    
    // Attach error handler for graceful fallback
    img.onerror = () => {
      console.warn(`Image not found: ${src}`);
      
      // If we have a specific fallback, try it
      if (fallbackSrc) {
        img.src = fallbackSrc;
      } else {
        // Use a generic placeholder or hide the image
        img.style.display = 'none';
        
        // Optionally add a tooltip or message
        img.title = 'Image not available';
      }
    };
    
    // Success handler (optional logging)
    img.onload = () => {
      console.log(`Image loaded: ${src}`);
    };
    
    return img;
  }

  /**
   * Generate muscle diagram HTML with fallback handling
   * @param {number} muscleId - Muscle ID to display
   * @param {'main'|'secondary'} type - Whether it's a main or secondary muscle
   * @returns {string} - HTML string with image element and error handler
   */
  static generateMuscleImageHTML(muscleId, type = 'main') {
    const baseDir = type === 'main' ? 'assets/images/muscles/main' : 'assets/images/muscles/secondary';
    const imageUrl = `${baseDir}/muscle-${muscleId}.svg`;
    
    // Use a placeholder image if the specific muscle diagram doesn't exist
    const fallbackUrl = `${baseDir}/placeholder-muscle.svg`;
    
    return `
      <img 
        src="${imageUrl}" 
        alt="Muscle ${muscleId}" 
        class="muscle-layer"
        onerror="this.style.display='none'; this.title='Diagram not available';"
      >
    `;
  }

  /**
   * Generate safe HTML for external URLs (exercise images/videos)
   * @param {string} url - External URL to render
   * @param {'image'|'video'} type - Type of media
   * @param {string} alt - Alt text or caption
   * @returns {string|null} - Safe HTML or null if URL is invalid
   */
  static renderExternalMedia(url, type = 'image', alt = '') {
    if (!url || url.trim() === '') {
      return '';
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (_) {
      console.warn('Invalid external media URL:', url);
      return '';
    }

    if (type === 'image') {
      return `
        <img 
          src="${url}" 
          alt="${alt}" 
          style="max-width: 200px; border-radius: 8px;"
          onerror="this.style.display='none'; this.parentElement.innerHTML='<p class=\"warning\">Image unavailable</p>';"
        >
      `;
    } else if (type === 'video') {
      return `
        <video controls width="300" style="border-radius: 8px;">
          <source src="${url}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `;
    }

    return '';
  }

  /**
   * Create a fallback/placeholder image
   * @returns {string} - SVG placeholder as data URI
   */
  static createPlaceholder() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect fill="#f0f0f0" width="100" height="100"/>
      <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">No Image</text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Batch process muscle images with proper fallbacks
   * @param {Array} muscleIds - Array of muscle IDs to render
   * @param {'main'|'secondary'} type - Whether it's a main or secondary muscle diagram
   * @param {boolean} showFront - Whether to show front view (true) or back view (false)
   * @param {Object} musclesData - Complete muscles array for filtering by is_front
   * @returns {string} - HTML string with all images and error handlers
   */
  static renderMuscleLayer(muscleIds, type, showFront, musclesData) {
    const filtered = muscleIds.filter(muscleId => {
      const muscle = musclesData.find(m => m.id === muscleId);
      return muscle && ((showFront && muscle.is_front) || (!showFront && !muscle.is_front));
    });

    if (filtered.length === 0) {
      return '';
    }

    return filtered.map(muscleId => 
      this.generateMuscleImageHTML(muscleId, type)
    ).join('');
  }

  /**
   * Create an error boundary wrapper for image containers
   * @param {string} content - HTML content to wrap
   * @param {string} fallbackContent - Content to show if all images fail
   * @returns {string} - Wrapped HTML with error handling
   */
  static createImageContainer(content, fallbackContent = '<p class="warning">Muscle diagrams not available</p>') {
    return `
      <div class="image-container" onerror="this.innerHTML='${fallbackContent.replace(/'/g, "\\'")}'">
        ${content}
      </div>
    `;
  }
}
