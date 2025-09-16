export function renderHeader() {
  return `
    <header>
      <div class="flex-container">
        <span aria-label="logo" style="font-size:2rem;">💪</span>
        <h2 style="margin:0;">Calisthenics Mastery</h2>
      </div>
      <nav class="flex-container" aria-label="Main navigation">
        <a href="#home">Home</a>
        <a href="#programs">Programs</a>
        <a href="#exercises">Exercises</a>
        <a href="#profile">Profile</a>
      </nav>
    </header>
  `;
} 