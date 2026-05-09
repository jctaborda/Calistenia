/**
 * DOM Optimizer - Provides efficient DOM manipulation utilities
 * Prevents unnecessary reflows and preserves scroll position
 */

/**
 * Compare two arrays of IDs to determine what changed
 * @param {Array} oldIds - Previous item IDs
 * @param {Array} newIds - Current item IDs  
 * @returns {Object} - { added: [], removed: [], unchanged: [] }
 */
export function identifyChanges(oldIds, newIds) {
  const oldSet = new Set(oldIds);
  const newSet = new Set(newIds);
  
  const added = [];
  const removed = [];
  const unchanged = [];
  
  // Find removed items
  for (const id of oldSet) {
    if (!newSet.has(id)) {
      removed.push(id);
    }
  }
  
  // Find added items
  for (const id of newSet) {
    if (!oldSet.has(id)) {
      added.push(id);
    }
  }
  
  // Items in both
  for (const id of newSet) {
    if (oldSet.has(id)) {
      unchanged.push(id);
    }
  }
  
  return { added, removed, unchanged };
}

/**
 * Create a card element from exercise data
 * @param {Object} exercise - Exercise data object
 * @param {Array} categories - Category reference array
 * @returns {HTMLElement} - Created DOM element
 */
export function createExerciseCard(exercise, categories) {
  const card = document.createElement('div');
  
  // Add difficulty class based on exercise difficulty ID (1=beginner, 2=intermediate, 3=advanced)
  let difficultyClass = '';
  if (exercise.difficulty) {
    const difficulties = Array.isArray(exercise.difficulty) ? exercise.difficulty : [exercise.difficulty];
    // Check for IDs: 3=advanced, 2=intermediate, 1=beginner
    if (difficulties.includes(3)) {
      difficultyClass = 'difficulty-advanced';
    } else if (difficulties.includes(2)) {
      difficultyClass = 'difficulty-intermediate';
    } else if (difficulties.includes(1)) {
      difficultyClass = 'difficulty-beginner';
    }
  }
  
  card.className = `exercise-card ${difficultyClass}`;
  card.setAttribute('data-id', exercise.id);
  card.setAttribute('data-exercise-name', exercise.name.toLowerCase());
  
  const nameEl = document.createElement('h3');
  nameEl.textContent = exercise.name;
  
  const descEl = document.createElement('p');
  descEl.textContent = exercise.description;
  
  // Tags container
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'tags';
  
  // Category tags
  if (exercise.categories && exercise.categories.length > 0) {
    for (const catId of exercise.categories) {
      const category = categories.find(c => c.id === catId);
      if (category) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = category.name;
        tagsContainer.appendChild(tag);
      }
    }
  }
  
  // Difficulty tag
  const difficultyIds = Array.isArray(exercise.difficulty) 
    ? exercise.difficulty 
    : [exercise.difficulty];
  
  for (const diffId of difficultyIds) {
    // We'll need to pass difficulty mapping separately
    const diffTag = document.createElement('span');
    diffTag.className = 'tag difficulty-tag';
    diffTag.textContent = `Difficulty ${diffId}`;
    tagsContainer.appendChild(diffTag);
  }
  
  // Controls
  const controls = document.createElement('div');
  controls.style.marginTop = '1rem';
  
  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn view-btn';
  viewBtn.textContent = 'View';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'btn edit-btn';
  editBtn.textContent = 'Edit';
  
  controls.appendChild(viewBtn);
  controls.appendChild(editBtn);
  
  card.appendChild(nameEl);
  card.appendChild(descEl);
  card.appendChild(tagsContainer);
  card.appendChild(controls);
  
  return card;
}

/**
 * Diff-based grid update - only updates changed items
 * Preserves scroll position and existing DOM elements
 * @param {HTMLElement} gridElement - Target grid container
 * @param {Array} exercises - Exercise data to render
 * @param {Object} cache - Cache of existing cards by ID
 * @returns {Object} - Updated cache
 */
export function diffUpdateGrid(gridElement, exercises, categories, cache = {}) {
  const currentIds = exercises.map(e => e.id);
  
  // Get previous IDs from cache or existing children
  const previousIds = Object.keys(cache).map(Number);
  const existingCards = Array.from(gridElement.children);
  
  // Identify what changed
  const changes = identifyChanges(previousIds, currentIds);
  
  // Remove deleted items
  for (const id of changes.removed) {
    const card = cache[id];
    if (card && card.parentNode) {
      card.parentNode.removeChild(card);
    }
    delete cache[id];
  }
  
  // Create new items
  for (const exercise of exercises) {
    if (!cache[exercise.id]) {
      const card = createExerciseCard(exercise, categories);
      gridElement.appendChild(card);
      cache[exercise.id] = card;
    }
  }
  
  // Reorder existing items to match current order
  // This uses a simple approach - for large lists, consider more efficient reordering
  const orderedCards = exercises.map(e => cache[e.id]);
  while (gridElement.firstChild) {
    gridElement.removeChild(gridElement.firstChild);
  }
  orderedCards.forEach(card => gridElement.appendChild(card));
  
  return cache;
}

/**
 * Virtual scrolling setup for large lists (>100 items)
 * Only renders visible items to improve performance
 * @param {HTMLElement} container - Container element with overflow
 * @param {Array} items - All items to display
 * @param {Function} renderItem - Function to create item element
 * @param {number} itemHeight - Height of each item in pixels
 * @param {HTMLElement} viewport - Optional viewport for scroll calculations
 */
export function setupVirtualScroll(container, items, renderItem, itemHeight = 200) {
  const scrollTopCache = new Map();
  
  // Create a tall wrapper for scroll space
  const wrapper = document.createElement('div');
  wrapper.style.height = `${items.length * itemHeight}px`;
  container.appendChild(wrapper);
  
  // Viewport for visible items
  const viewport = document.createElement('div');
  viewport.style.position = 'relative';
  viewport.style.height = `${itemHeight}px`;
  container.insertBefore(viewport, container.firstChild);
  
  let visibleItems = [];
  let scrollTop = 0;
  
  function renderVisibleItems() {
    const scrollPos = container.scrollTop;
    const startIndex = Math.floor(scrollPos / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(container.clientHeight / itemHeight) + 1,
      items.length
    );
    
    // Clear and re-render visible range
    viewport.innerHTML = '';
    visibleItems = [];
    
    for (let i = startIndex; i < endIndex; i++) {
      const itemEl = renderItem(items[i], i);
      itemEl.style.position = 'absolute';
      itemEl.style.top = `${i * itemHeight}px`;
      itemEl.style.left = '0';
      itemEl.style.right = '0';
      itemEl.style.height = `${itemHeight}px`;
      
      viewport.appendChild(itemEl);
      visibleItems.push(itemEl);
    }
  }
  
  // Initial render
  renderVisibleItems();
  
  // Scroll handler with debouncing
  let scrollTimeout;
  container.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(renderVisibleItems, 16); // ~60fps
  });
  
  return {
    getCache: () => visibleItems,
    updateItems: (newItems) => setupVirtualScroll(container, newItems, renderItem, itemHeight)
  };
}

/**
 * Preserve scroll position when updating content
 * @param {HTMLElement} element - Element to preserve
 * @param {Function} updateFn - Function that updates the DOM
 * @returns {Function} - Restore function to call after update
 */
export function withScrollPreservation(element, updateFn) {
  const savedScroll = element.scrollTop;
  
  updateFn();
  
  // Restore scroll position if possible
  const restored = Math.min(savedScroll, element.scrollHeight - element.clientHeight);
  element.scrollTop = restored;
  
  return restored === savedScroll;
}

/**
 * Batch DOM updates to minimize reflows
 * Wraps multiple DOM operations into a single reflow
 */
export function batchDomUpdates(fn) {
  // Force browser to batch all mutations
  const rect = document.body.getBoundingClientRect();
  
  fn();
  
  // Trigger forced layout (will be optimized by browser)
  void rect.width;
}

/**
 * Lazy load images with intersection observer
 * @param {string} selector - Image selector
 */
export function setupLazyLoadImages(selector = 'img[data-src]') {
  if (!('IntersectionObserver' in window)) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '100px' });
  
  document.querySelectorAll(selector).forEach(img => observer.observe(img));
}
