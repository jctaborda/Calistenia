export function renderHeader() {
  return `
    <header>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span aria-label="logo" style="font-size:2rem;">💪</span>
        <h2 style="margin:0;">Calisthenics Mastery</h2>
      </div>
      <nav aria-label="Main navigation">
        <a href="#home">Home</a>
        <a href="#programs">Programs</a>
        <a href="#exercises">Exercises</a>
        <a href="#builder">Routine Builder</a>
        <a href="#profile">Profile</a>
      </nav>
    </header>
  `;
} 