export function renderHeader() {
  // Check theme on documentElement to match index.html approach
  const isDarkMode = document.documentElement.classList.contains('dark');
  
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
  // Theme is already applied in index.html before CSS loads
  
  // Use event delegation on a stable parent element (#app-header)
  document.addEventListener('click', (e) => {
    const themeToggle = e.target.closest('#theme-toggle');
    if (!themeToggle) return;
    
    e.preventDefault();
    
    // Toggle on documentElement for consistency with index.html
    const isDarkMode = document.documentElement.classList.toggle('dark');
    const newTheme = isDarkMode ? 'dark' : 'light';
    
    // Update button text
    themeToggle.textContent = isDarkMode ? '☀️ Light' : '🌙 Dark';
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
  });
});
