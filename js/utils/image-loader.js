/**
 * Image Loader Utility
 * Handles loading optimized images with WebP fallback
 * Supports srcset for responsive images
 */

export class ImageLoader {
  /**
   * Check if browser supports WebP
   * @returns {Promise<boolean>}
   */
  static async supportsWebP() {
    if (this._webpSupported !== undefined) {
      return this._webpSupported;
    }
    
    // Test WebP support
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      this._webpSupported = webp.width === 2;
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAEALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    
    return this._webpSupported;
  }
  
  /**
   * Get optimized image URL with WebP preference
   * @param {string} imagePath - Base image path (without extension)
   * @param {string} preferredFormat - 'webp' or 'original'
   * @returns {Promise<string>} Optimized image URL
   */
  static async getOptimizedUrl(imagePath, preferredFormat = 'auto') {
    const supportsWebP = await this.supportsWebP();
    
    if (preferredFormat === 'webp' || (preferredFormat === 'auto' && supportsWebP)) {
      // Try WebP version first
      const webpPath = imagePath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
      if (await this.imageExists(webpPath)) {
        return webpPath;
      }
    }
    
    // Fall back to original format
    return imagePath;
  }
  
  /**
   * Check if an image file exists
   * @param {string} imagePath - Image path to check
   * @returns {Promise<boolean>}
   */
  static async imageExists(imagePath) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imagePath;
    });
  }
  
  /**
   * Generate srcset attribute for responsive images
   * @param {string} imagePath - Base image path
   * @param {number[]} sizes - Array of widths in pixels
   * @returns {string} srcset attribute string
   */
  static generateSrcset(imagePath, sizes = [300, 600, 1200]) {
    let srcset = '';
    
    sizes.forEach((width, index) => {
      const formattedWidth = width.toString().padStart(3, '0');
      const pathWithSize = imagePath.replace(
        /\.(jpg|jpeg|png|gif)$/i,
        `-${formattedWidth}w$1`
      );
      
      if (index > 0) srcset += ', ';
      srcset += `${pathWithSize} ${width}w`;
    });
    
    return srcset;
  }
  
  /**
   * Create HTML image element with lazy loading
   * @param {string} imagePath - Image path
   * @param {string} alt - Alt text
   * @param {object} options - Additional options
   * @returns {string} HTML string
   */
  static createImageHtml(imagePath, alt, options = {}) {
    const {
      width,
      height,
      className = '',
      loading = 'lazy',
      priority = false,
      useWebP = true
    } = options;
    
    const attrs = [
      `src="${imagePath}"`,
      `alt="${this.escapeHtml(alt)}"`,
      `loading="${loading}"`
    ];
    
    if (width) attrs.push(`width="${width}"`);
    if (height) attrs.push(`height="${height}"`);
    if (className) attrs.push(`class="${className}"`);
    if (priority) attrs.push(`fetchpriority="high"`);
    
    return `<img ${attrs.join(' ')}>`;
  }
  
  /**
   * Create picture element with WebP fallback
   * @param {string} imagePath - Base image path
   * @param {string} alt - Alt text
   * @returns {string} HTML string
   */
  static createPictureHtml(imagePath, alt) {
    const baseName = imagePath.replace(/\.(jpg|jpeg|png|gif)$/i, '');
    const ext = imagePath.match(/\.(jpg|jpeg|png|gif)$/i)?.[1] || 'jpg';
    
    return `
      <picture>
        <source srcset="${baseName}.webp" type="image/webp">
        <img src="${imagePath}" alt="${this.escapeHtml(alt)}" loading="lazy">
      </picture>
    `.trim();
  }
  
  /**
   * Preload critical images
   * @param {string[]} imagePaths - Array of image paths to preload
   */
  static preloadImages(imagePaths) {
    imagePaths.forEach(path => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = path;
      document.head.appendChild(link);
    });
  }
  
  /**
   * Lazy load images below viewport
   * @param {string} selector - CSS selector for images to lazy load
   */
  static lazyLoadImages(selector = 'img[data-lazy]') {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-lazy');
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );
    
    document.querySelectorAll(selector).forEach(img => {
      observer.observe(img);
    });
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
export default ImageLoader;
