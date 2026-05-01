export function renderHeader() {
  const isDarkMode = document.body.classList.contains('dark-mode');
  
  return `
    <header id="app-header">
      <div class="flex-container">
        <span aria-label="logo" style="font-size:2rem;">💪</span>
        <h2 style="margin:0;">Calisthenics Mastery</h2>
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">
          ${isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
      <nav class="flex-container" aria-label="Main navigation">
        <a href="#home">Home</a>
        <a href="#programs">Programs</a>
        <a href="#exercises">Exercises</a>
        <a href="#skill-modules">Skills</a>
        <a href="#profile">Profile</a>
      </nav>
    </header>
  `;
}

// Theme toggle functionality - attach once DOM is ready using event delegation on header
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply saved theme immediately
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
  
  // Use event delegation on a stable parent element (#app-header)
  document.addEventListener('click', (e) => {
    const themeToggle = e.target.closest('#theme-toggle');
    if (!themeToggle) return;
    
    e.preventDefault();
    
    const isDarkMode = document.body.classList.toggle('dark-mode');
    const newTheme = isDarkMode ? 'dark' : 'light';
    
    // Update button text
    themeToggle.textContent = isDarkMode ? '☀️ Light' : '🌙 Dark';
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
  });
});
