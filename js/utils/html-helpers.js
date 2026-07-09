// js/utils/html-helpers.js - HTML escaping and templating utilities

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Tagged template helper for safe HTML interpolation
 * Automatically escapes all string arguments to prevent XSS
 * 
 * @param {Array<string>} strings - Template literal string parts
 * @param {...*} values - Values to interpolate (automatically escaped if strings)
 * @returns {string} Safely interpolated HTML string
 * 
 * @example
 * const name = '<script>alert("xss")</script>';
 * html`<p>Hello, ${name}</p>` // <p>Hello, &lt;script&gt;alert("xss")&lt;/script&gt;</p>
 */
export function html(strings, ...values) {
  const escapedValues = values.map(value => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
      // For objects/arrays, stringify and escape
      return escapeHtml(JSON.stringify(value));
    }
    // Escape strings
    return escapeHtml(String(value));
  });
  
  // Interpolate escaped values into template strings
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < escapedValues.length) {
      result += escapedValues[i];
    }
  }
  
  return result;
}

/**
 * Create a safe HTML string with a single element
 * @param {string} tagName - HTML tag name
 * @param {object} props - HTML attributes (event handlers are stripped)
 * @param {...*} children - Child nodes/text (automatically escaped)
 * @returns {string} Safe HTML string
 * 
 * @example
 * createElement('div', { class: 'container' }, 'Hello', createElement('span', {}, 'World'))
 */
export function createElement(tagName, props = {}, ...children) {
  const escapedProps = Object.entries(props)
    .filter(([key]) => !key.startsWith('on')) // Strip event handlers for safety
    .map(([key, value]) => {
      if (value === null || value === undefined || value === false) return '';
      const escapedValue = escapeHtml(String(value));
      return key === 'className' ? `class="${escapedValue}"` : `${key}="${escapedValue}"`;
    })
    .filter(Boolean)
    .join(' ');
  
  const attrString = escapedProps ? ` ${escapedProps}` : '';
  
  const escapedChildren = children
    .map(child => {
      if (child === null || child === undefined) return '';
      if (typeof child === 'boolean') return '';
      if (typeof child === 'number') return child.toString();
      if (typeof child === 'string') return escapeHtml(child);
      if (typeof child === 'object') {
        // Assume it's already an HTML string (from another createElement or html call)
        return child;
      }
      return escapeHtml(String(child));
    })
    .join('');
  
  return `<${tagName}${attrString}>${escapedChildren}</${tagName}>`;
}
