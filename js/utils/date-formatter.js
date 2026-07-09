// Date Formatter Utility - Consistent date formatting throughout the app
export function formatDate(isoString, options = {}) {
  if (!isoString) return '-';
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return invalidDateDisplay();
  
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day for accurate comparison
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffMs = now - targetDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const { mode = 'relative', locale = 'en-US' } = options;
  
  // Relative date format (default)
  if (mode === 'relative') {
    // Use locale-aware relative date strings
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diffDays === 0) return formatter.format(0, 'day');
    if (diffDays === 1) return formatter.format(-1, 'day');
    if (diffDays < 7) return formatter.format(-diffDays, 'day');
    if (diffDays < 14) return formatter.format(-1, 'week');
    
    // For older dates, check if within current year
    const showYear = now.getFullYear() !== targetDate.getFullYear();
    
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: showYear ? 'numeric' : undefined
    });
  }
  
  // Absolute date format
  if (mode === 'absolute') {
    const showTime = options.showTime !== false;
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: options.showHours ? '2-digit' : undefined,
      minute: showTime ? '2-digit' : undefined
    });
  }
  
  // Short format (compact display)
  if (mode === 'short') {
    return date.toLocaleDateString(locale, {
      month: 'numeric',
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  }
  
  // Default to relative format
  return formatDate(isoString, { mode: 'relative', locale });
}

// Format for time-only display
export function formatTime(isoString, locale = 'en-US') {
  if (!isoString) return '-';
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format for timeline/comparison display
export function formatTimelineDate(isoString, locale = 'en-US') {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric'
  });
}

// Format for workout completion details
export function formatWorkoutDate(isoString, includeTime = true, locale = 'en-US') {
  if (!isoString) return '-';
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';
  
  // Relative mode
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffMs = now - targetDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return includeTime ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day') : '';
  }
  
  if (includeTime) {
    const showYear = now.getFullYear() !== targetDate.getFullYear();
    const datePart = date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: showYear ? 'numeric' : undefined
    });
    
    const timePart = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${datePart}, ${timePart}`;
  }
  
  return formatDate(isoString, { mode: 'relative', locale });
}

// Format for progress chart labels
export function formatChartDate(isoString, locale = 'en-US') {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric'
  });
}

// Get formatted date range for workout history
export function formatDateRange(startDate, endDate, locale = 'en-US') {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
  
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth();
  
  const options = {
    year: sameYear ? undefined : 'numeric',
    month: sameMonth ? undefined : 'short'
  };
  
  const startDateStr = start.toLocaleDateString(locale, options);
  const endDateStr = end.toLocaleDateString(locale, {
    month: sameYear ? options.month : undefined,
    day: 'numeric',
    year: sameYear ? undefined : 'numeric'
  });
  
  if (sameMonth && sameYear) {
    return `${startDateStr} - ${endDateStr}`;
  }
  
  return `${startDateStr} - ${endDateStr}`;
}

// Helper for invalid dates
function invalidDateDisplay() {
  return 'Invalid date';
}

// Export as object for compatibility with default imports
export default {
  formatDate,
  formatTime,
  formatTimelineDate,
  formatWorkoutDate,
  formatChartDate,
  formatDateRange
};
