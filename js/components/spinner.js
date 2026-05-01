export function renderSpinner() {
  return `
    <div class="spinner-overlay">
      <div class="spinner"></div>
    </div>
  `;
}

export function hideSpinner() {
  const spinner = document.querySelector('.spinner-overlay');
  if (spinner) {
    spinner.remove();
  }
}
